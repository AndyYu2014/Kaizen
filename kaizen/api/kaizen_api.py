import frappe
from frappe import _
from datetime import datetime, timedelta


# ─── 权限控制 ───────────────────────────────────────────

def has_kaizen_permission():
    return True  # 所有登录用户可访问


def proposal_permission(doc, user):
    if frappe.has_role("System Manager", user):
        return True
    if doc.submitted_by == user:
        return True
    return False


def project_permission(doc, user):
    if frappe.has_role("System Manager", user):
        return True
    return True  # 所有人可读


# ─── 首页数据接口 ────────────────────────────────────────

@frappe.whitelist()
def get_home_stats():
    """精益首页统计数据"""
    user = frappe.session.user

    # 我的提案（不含已立项和已取消）
    my_proposals = frappe.db.count("Kaizen Proposal", {
        "submitted_by": user,
        "status": ["not in", ["已立项", "已取消"]]
    })

    # 我发起提案关联的未关闭改善项目
    my_proposals_list = frappe.db.get_all("Kaizen Proposal",
        filters={"submitted_by": user},
        pluck="name"
    )
    my_projects = frappe.db.count("Kaizen Project", {
        "source_proposal": ["in", my_proposals_list],
        "status": ["not in", ["已关闭", "已取消"]]
    }) if my_proposals_list else 0

    # 等待处理：需要当前用户审核/处理的
    pending = _get_pending_count(user)

    return {
        "my_proposals": my_proposals,
        "my_projects": my_projects,
        "pending": pending,
    }


def _get_pending_count(user):
    """计算需要当前用户处理的事项数"""
    count = 0
    # 待审核的提案（已提交状态，由 System Manager 处理）
    if frappe.has_role("System Manager", user):
        count += frappe.db.count("Kaizen Proposal", {"status": "已提交"})
        count += frappe.db.count("Kaizen Project", {"status": "方案编制中"})
        count += frappe.db.count("Kaizen Project", {"status": "实施中"})
        count += frappe.db.count("Kaizen Project", {"status": "评价中"})
    return count


@frappe.whitelist()
def get_trend_data():
    """获取近3个月折线图数据"""
    three_months_ago = datetime.now() - timedelta(days=90)
    date_str = three_months_ago.strftime("%Y-%m-%d")

    # 按月聚合提案数量
    proposal_data = frappe.db.sql("""
        SELECT
            DATE_FORMAT(submitted_date, '%%Y-%%m') as month,
            status,
            COUNT(*) as count
        FROM `tabKaizen Proposal`
        WHERE submitted_date >= %s
        AND status NOT IN ('已立项', '已取消')
        GROUP BY month, status
        ORDER BY month
    """, date_str, as_dict=True)

    # 按月聚合改善项目数量
    project_data = frappe.db.sql("""
        SELECT
            DATE_FORMAT(creation, '%%Y-%%m') as month,
            status,
            COUNT(*) as count
        FROM `tabKaizen Project`
        WHERE creation >= %s
        AND status NOT IN ('已取消')
        GROUP BY month, status
        ORDER BY month
    """, date_str, as_dict=True)

    return {
        "proposals": proposal_data,
        "projects": project_data
    }


# ─── 改善提案接口 ─────────────────────────────────────────

@frappe.whitelist()
def get_my_proposals(include_closed=0):
    """获取我的提案列表"""
    user = frappe.session.user
    filters = {"submitted_by": user}
    if not int(include_closed):
        filters["status"] = ["not in", ["已立项", "已取消"]]

    proposals = frappe.db.get_all("Kaizen Proposal",
        filters=filters,
        fields=["name", "kaizen_type", "status", "submitted_date",
                "phenomenon_description", "kaizen_project"],
        order_by="submitted_date desc"
    )

    # 补充改善项目信息
    for p in proposals:
        if p.get("kaizen_project"):
            proj = frappe.db.get_value("Kaizen Project",
                p["kaizen_project"],
                ["status", "departments"],
                as_dict=True
            )
            if proj:
                p["project_status"] = proj.get("status")
                # 获取第一个实施部门
                depts = frappe.db.get_all("Kaizen Project Department",
                    filters={"parent": p["kaizen_project"]},
                    fields=["department"],
                    limit=1
                )
                p["dept"] = depts[0]["department"] if depts else ""

    return proposals


@frappe.whitelist()
def save_proposal(data):
    """保存或新建改善提案"""
    import json
    if isinstance(data, str):
        data = json.loads(data)

    user = frappe.session.user

    if data.get("name"):
        # 更新已有提案
        doc = frappe.get_doc("Kaizen Proposal", data["name"])
        if doc.submitted_by != user and not frappe.has_role("System Manager", user):
            frappe.throw(_("您没有权限编辑此提案"))
    else:
        # 新建提案
        doc = frappe.new_doc("Kaizen Proposal")
        doc.submitted_by = user
        doc.submitted_date = datetime.now()

    doc.kaizen_type = data.get("kaizen_type")
    doc.production_line = data.get("production_line")
    doc.equipment = data.get("equipment")
    doc.warehouse = data.get("warehouse")
    doc.item = data.get("item")
    doc.voice_notes = data.get("voice_notes")
    doc.phenomenon_description = data.get("phenomenon_description")
    doc.suggestion_description = data.get("suggestion_description")

    submit = data.get("submit", False)
    if submit:
        doc.status = "已提交"
    else:
        doc.status = "待提交"

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def cancel_proposal(proposal_name, reason):
    """取消提案"""
    doc = frappe.get_doc("Kaizen Proposal", proposal_name)
    user = frappe.session.user
    if doc.submitted_by != user and not frappe.has_role("System Manager", user):
        frappe.throw(_("您没有权限取消此提案"))
    doc.status = "已取消"
    doc.cancel_reason = reason
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}


# ─── 提案审核接口 ─────────────────────────────────────────

@frappe.whitelist()
def get_proposals_for_review():
    """获取待审核提案列表"""
    return frappe.db.get_all("Kaizen Proposal",
        filters={"status": "已提交"},
        fields=["name", "kaizen_type", "status", "submitted_by",
                "submitted_date", "phenomenon_description"],
        order_by="submitted_date asc"
    )


@frappe.whitelist()
def approve_proposal(data):
    """审核通过：创建改善项目"""
    import json
    if isinstance(data, str):
        data = json.loads(data)

    frappe.only_for("System Manager")

    proposal = frappe.get_doc("Kaizen Proposal", data["proposal_name"])

    # 创建改善项目
    project = frappe.new_doc("Kaizen Project")
    project.source_proposal = proposal.name
    project.kaizen_type = proposal.kaizen_type
    project.status = "方案编制中"
    project.urgency = data.get("urgency")
    project.economic_impact = data.get("economic_impact")
    project.quality_impact = data.get("quality_impact")
    project.improvement_goal = data.get("improvement_goal")
    project.expected_completion_date = data.get("expected_completion_date")
    project.project_leader = data.get("project_leader")

    # 实施部门
    departments = data.get("departments", [])
    for dept in departments:
        project.append("departments", {
            "department": dept.get("department"),
            "responsible_person": dept.get("responsible_person"),
            "role_description": dept.get("role_description"),
        })

    project.insert(ignore_permissions=True)

    # 更新提案状态
    proposal.status = "已立项"
    proposal.kaizen_project = project.name
    proposal.reviewer = frappe.session.user
    proposal.review_date = datetime.now()
    proposal.save(ignore_permissions=True)

    frappe.db.commit()
    return {"project_name": project.name}


@frappe.whitelist()
def reject_proposal(proposal_name, reason):
    """拒绝提案"""
    frappe.only_for("System Manager")
    doc = frappe.get_doc("Kaizen Proposal", proposal_name)
    doc.status = "已取消"
    doc.cancel_reason = reason
    doc.reviewer = frappe.session.user
    doc.review_date = datetime.now()
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}


# ─── 改善方案编制接口 ──────────────────────────────────────

@frappe.whitelist()
def get_projects_for_plan():
    """获取待编制方案的改善项目"""
    return frappe.db.get_all("Kaizen Project",
        filters={"status": "方案编制中"},
        fields=["name", "project_no", "kaizen_type", "status",
                "urgency", "expected_completion_date", "source_proposal"],
        order_by="creation asc"
    )


@frappe.whitelist()
def save_project_plan(data):
    """保存改善方案"""
    import json
    if isinstance(data, str):
        data = json.loads(data)

    doc = frappe.get_doc("Kaizen Project", data["project_name"])
    doc.temporary_measures = data.get("temporary_measures")
    doc.permanent_measures = data.get("permanent_measures")
    doc.plan_start_date = data.get("plan_start_date")
    doc.plan_end_date = data.get("plan_end_date")

    # 更新实施部门
    doc.departments = []
    for dept in data.get("departments", []):
        doc.append("departments", dept)

    if data.get("submit"):
        doc.status = "实施中"

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}


# ─── 改善实施接口 ─────────────────────────────────────────

@frappe.whitelist()
def get_projects_for_implement():
    """获取实施中的改善项目"""
    return frappe.db.get_all("Kaizen Project",
        filters={"status": "实施中"},
        fields=["name", "project_no", "kaizen_type", "status",
                "plan_end_date", "source_proposal"],
        order_by="plan_end_date asc"
    )


@frappe.whitelist()
def save_implement_result(data):
    """保存实施结果"""
    import json
    if isinstance(data, str):
        data = json.loads(data)

    doc = frappe.get_doc("Kaizen Project", data["project_name"])
    doc.actual_start_date = data.get("actual_start_date")
    doc.implement_result = data.get("implement_result")

    if data.get("submit"):
        doc.status = "评价中"

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}


# ─── 改善评价接口 ─────────────────────────────────────────

@frappe.whitelist()
def get_projects_for_evaluate():
    """获取待评价的改善项目"""
    return frappe.db.get_all("Kaizen Project",
        filters={"status": "评价中"},
        fields=["name", "project_no", "kaizen_type", "status",
                "implement_result", "source_proposal"],
        order_by="creation asc"
    )


@frappe.whitelist()
def save_evaluation(data):
    """保存评价结果"""
    import json
    if isinstance(data, str):
        data = json.loads(data)

    frappe.only_for("System Manager")

    doc = frappe.get_doc("Kaizen Project", data["project_name"])
    rating = int(data.get("star_rating", 0))
    if rating < 1 or rating > 5:
        frappe.throw(_("星级评价必须在 1 到 5 之间"))

    doc.star_rating = rating
    doc.incentive_measures = data.get("incentive_measures")
    doc.evaluator = frappe.session.user
    doc.evaluate_date = datetime.now()
    doc.actual_completion_date = datetime.now().date()
    doc.status = "已关闭"
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}


# ─── 精益课堂接口 ─────────────────────────────────────────

@frappe.whitelist()
def get_learning_list(category=None):
    """获取精益课堂文章列表"""
    filters = {"is_published": 1}
    if category:
        filters["category"] = category

    return frappe.db.get_all("Kaizen Learning",
        filters=filters,
        fields=["name", "title", "category", "publish_date",
                "cover_image", "view_count", "star_rating"],
        order_by="publish_date desc"
    )


@frappe.whitelist()
def get_learning_detail(name):
    """获取文章详情并增加阅读计数"""
    doc = frappe.get_doc("Kaizen Learning", name)
    doc.db_set("view_count", (doc.view_count or 0) + 1)
    return doc.as_dict()


# ─── 报表接口 ─────────────────────────────────────────────

@frappe.whitelist()
def get_my_report():
    """我的改善报表"""
    user = frappe.session.user
    proposals = frappe.db.get_all("Kaizen Proposal",
        filters={"submitted_by": user},
        fields=["name", "kaizen_type", "status", "submitted_date", "kaizen_project"],
        order_by="submitted_date desc"
    )
    return proposals


@frappe.whitelist()
def get_department_report():
    """部门改善统计"""
    return frappe.db.sql("""
        SELECT
            kpd.department,
            COUNT(DISTINCT kp.name) as project_count,
            SUM(CASE WHEN kp.status='已关闭' THEN 1 ELSE 0 END) as closed_count,
            AVG(kp.star_rating) as avg_rating
        FROM `tabKaizen Project Department` kpd
        JOIN `tabKaizen Project` kp ON kp.name = kpd.parent
        GROUP BY kpd.department
        ORDER BY project_count DESC
    """, as_dict=True)


@frappe.whitelist()
def get_type_analysis():
    """精益类型分析"""
    return frappe.db.sql("""
        SELECT
            kaizen_type,
            COUNT(*) as proposal_count,
            SUM(CASE WHEN status='已立项' THEN 1 ELSE 0 END) as project_count
        FROM `tabKaizen Proposal`
        GROUP BY kaizen_type
        ORDER BY proposal_count DESC
    """, as_dict=True)


@frappe.whitelist()
def get_status_dashboard():
    """改善进度看板"""
    proposal_stats = frappe.db.sql("""
        SELECT status, COUNT(*) as count
        FROM `tabKaizen Proposal`
        GROUP BY status
    """, as_dict=True)

    project_stats = frappe.db.sql("""
        SELECT status, COUNT(*) as count
        FROM `tabKaizen Project`
        GROUP BY status
    """, as_dict=True)

    return {
        "proposals": proposal_stats,
        "projects": project_stats
    }


@frappe.whitelist()
def get_excellent_list():
    """优秀改善榜（4星以上）"""
    return frappe.db.get_all("Kaizen Project",
        filters={"star_rating": [">=", 4], "status": "已关闭"},
        fields=["name", "project_no", "kaizen_type", "star_rating",
                "implement_result", "actual_completion_date"],
        order_by="star_rating desc, actual_completion_date desc"
    )


# ─── 通知 ──────────────────────────────────────────────────

def send_pending_reminders():
    """每日提醒：发送待处理通知给相关人员"""
    # 找出即将超期的改善项目
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    overdue_projects = frappe.db.get_all("Kaizen Project",
        filters={
            "status": ["in", ["方案编制中", "实施中"]],
            "expected_completion_date": ["<=", tomorrow]
        },
        fields=["name", "project_no", "project_leader", "expected_completion_date"]
    )

    for proj in overdue_projects:
        if proj.get("project_leader"):
            frappe.sendmail(
                recipients=[frappe.db.get_value("User", proj["project_leader"], "email")],
                subject=f"【精益管理】改善项目即将超期：{proj['project_no']}",
                message=f"""
                    <p>您好，</p>
                    <p>改善项目 <strong>{proj['project_no']}</strong> 预计完成日期为
                    {proj['expected_completion_date']}，请及时跟进。</p>
                """,
                now=True
            )
