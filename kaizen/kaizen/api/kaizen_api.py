import frappe
from frappe.utils import nowdate, add_months, getdate, now_datetime

def has_permission(user=None):
    return True

def has_website_permission(doc, ptype, user, verbose=False):
    return True


# ─────────────────────────────────────────────
# 首页统计数据
# ─────────────────────────────────────────────
@frappe.whitelist()
def get_home_stats():
    user = frappe.session.user
    three_months_ago = add_months(nowdate(), -3)

    # 折线图：近三个月各状态数量
    chart_data = frappe.db.sql("""
        SELECT
            DATE_FORMAT(creation, '%%Y-%%m') as month,
            status,
            COUNT(*) as cnt
        FROM `tabKaizen Proposal`
        WHERE creation >= %(start)s
          AND status NOT IN ('已取消')
        GROUP BY month, status
        ORDER BY month ASC
    """, {"start": three_months_ago}, as_dict=True)

    project_chart = frappe.db.sql("""
        SELECT
            DATE_FORMAT(creation, '%%Y-%%m') as month,
            status,
            COUNT(*) as cnt
        FROM `tabKaizen Project`
        WHERE creation >= %(start)s
          AND status NOT IN ('已取消')
        GROUP BY month, status
        ORDER BY month ASC
    """, {"start": three_months_ago}, as_dict=True)

    # 我的提案数（排除已立项和已取消）
    my_proposals = frappe.db.count("Kaizen Proposal", {
        "submitted_by": user,
        "status": ["not in", ["已立项", "已取消"]]
    })

    # 我关联的改善项目数（未关闭/取消）
    my_projects = frappe.db.count("Kaizen Project", {
        "proposal": ["in", frappe.db.get_all(
            "Kaizen Proposal",
            filters={"submitted_by": user},
            pluck="name"
        )],
        "status": ["not in", ["已关闭", "已取消"]]
    })

    # 等待我处理的（审核 + 方案编制 + 实施 + 评价）
    pending_review = frappe.db.count("Kaizen Proposal", {
        "status": "已提交",
        "reviewer": ["in", [user, ""]],
    })
    pending_plan = _get_my_pending_projects("方案编制中", user)
    pending_implement = _get_my_pending_projects("实施中", user)
    pending_evaluate = _get_my_pending_projects("评价中", user)
    pending_total = pending_review + pending_plan + pending_implement + pending_evaluate

    return {
        "chart_data": chart_data,
        "project_chart": project_chart,
        "my_proposals": my_proposals,
        "my_projects": my_projects,
        "pending_total": pending_total,
        "pending_review": pending_review,
        "pending_plan": pending_plan,
        "pending_implement": pending_implement,
        "pending_evaluate": pending_evaluate,
    }


def _get_my_pending_projects(status, user):
    """获取我参与的特定状态项目数"""
    sql = """
        SELECT COUNT(DISTINCT kp.name)
        FROM `tabKaizen Project` kp
        LEFT JOIN `tabKaizen Project Department` kpd ON kpd.parent = kp.name
        WHERE kp.status = %(status)s
          AND (kpd.responsible_person = %(user)s OR kp.name IN (
              SELECT kaizen_project FROM `tabKaizen Proposal`
              WHERE reviewer = %(user)s
          ))
    """
    result = frappe.db.sql(sql, {"status": status, "user": user})
    return result[0][0] if result else 0


# ─────────────────────────────────────────────
# 提案相关API
# ─────────────────────────────────────────────
@frappe.whitelist()
def get_my_proposals(include_closed=0):
    user = frappe.session.user
    filters = {"submitted_by": user}
    if not int(include_closed):
        filters["status"] = ["not in", ["已立项", "已取消"]]

    proposals = frappe.get_all("Kaizen Proposal",
        filters=filters,
        fields=["name", "status", "kaizen_type", "phenomenon",
                "submitted_date", "kaizen_project", "creation"],
        order_by="creation desc",
        limit=50
    )

    for p in proposals:
        if p.kaizen_project:
            proj = frappe.db.get_value("Kaizen Project", p.kaizen_project,
                ["status", "implementation_departments"], as_dict=True)
            p["project_status"] = proj.get("status") if proj else ""
            # 获取责任部门
            depts = frappe.get_all("Kaizen Project Department",
                filters={"parent": p.kaizen_project},
                fields=["department"],
                limit=3
            )
            p["departments"] = "、".join([d.department for d in depts]) if depts else ""
        else:
            p["project_status"] = ""
            p["departments"] = ""
    return proposals


@frappe.whitelist()
def create_proposal(data):
    if isinstance(data, str):
        import json
        data = json.loads(data)

    doc = frappe.new_doc("Kaizen Proposal")
    doc.kaizen_type = data.get("kaizen_type")
    doc.production_line = data.get("production_line")
    doc.equipment = data.get("equipment")
    doc.warehouse = data.get("warehouse")
    doc.item = data.get("item")
    doc.location_remark = data.get("location_remark")
    doc.phenomenon = data.get("phenomenon")
    doc.suggestion = data.get("suggestion")
    doc.submitted_by = frappe.session.user
    doc.status = "待提交"
    doc.insert()

    if data.get("submit_now"):
        doc.status = "已提交"
        doc.submitted_date = now_datetime()
        doc.save()

    return doc.name


@frappe.whitelist()
def submit_proposal(proposal_name):
    doc = frappe.get_doc("Kaizen Proposal", proposal_name)
    if doc.submitted_by != frappe.session.user:
        frappe.throw("只能提交自己的提案")
    doc.status = "已提交"
    doc.submitted_date = now_datetime()
    doc.save()
    return {"success": True, "name": doc.name}


# ─────────────────────────────────────────────
# 审核相关API
# ─────────────────────────────────────────────
@frappe.whitelist()
def get_pending_review_proposals():
    proposals = frappe.get_all("Kaizen Proposal",
        filters={"status": "已提交"},
        fields=["name", "kaizen_type", "phenomenon", "submitted_by",
                "submitted_date", "urgency", "economic_value", "quality_impact"],
        order_by="submitted_date asc"
    )
    return proposals


@frappe.whitelist()
def approve_proposal(data):
    if isinstance(data, str):
        import json
        data = json.loads(data)

    doc = frappe.get_doc("Kaizen Proposal", data.get("proposal_name"))
    project_name = doc.approve_and_create_project(data)
    return {"success": True, "project_name": project_name}


@frappe.whitelist()
def reject_proposal(proposal_name, reason=""):
    doc = frappe.get_doc("Kaizen Proposal", proposal_name)
    doc.cancel_proposal(reason)
    return {"success": True}


# ─────────────────────────────────────────────
# 改善方案编制API
# ─────────────────────────────────────────────
@frappe.whitelist()
def get_pending_plan_projects():
    user = frappe.session.user
    projects = frappe.db.sql("""
        SELECT DISTINCT kp.name, kp.title, kp.status, kp.proposal,
               kp.expected_completion_date, kp.kaizen_type
        FROM `tabKaizen Project` kp
        LEFT JOIN `tabKaizen Project Department` kpd ON kpd.parent = kp.name
        WHERE kp.status = '方案编制中'
          AND (kpd.responsible_person = %(user)s)
        ORDER BY kp.creation ASC
    """, {"user": user}, as_dict=True)
    return projects


@frappe.whitelist()
def submit_plan(data):
    if isinstance(data, str):
        import json
        data = json.loads(data)
    doc = frappe.get_doc("Kaizen Project", data.get("project_name"))
    doc.submit_plan(data)
    return {"success": True}


# ─────────────────────────────────────────────
# 实施相关API
# ─────────────────────────────────────────────
@frappe.whitelist()
def get_pending_implement_projects():
    user = frappe.session.user
    projects = frappe.db.sql("""
        SELECT DISTINCT kp.name, kp.title, kp.status, kp.proposal,
               kp.plan_start_date, kp.plan_end_date, kp.kaizen_type
        FROM `tabKaizen Project` kp
        LEFT JOIN `tabKaizen Project Department` kpd ON kpd.parent = kp.name
        WHERE kp.status = '实施中'
          AND kpd.responsible_person = %(user)s
        ORDER BY kp.plan_start_date ASC
    """, {"user": user}, as_dict=True)
    return projects


@frappe.whitelist()
def submit_implementation(data):
    if isinstance(data, str):
        import json
        data = json.loads(data)
    doc = frappe.get_doc("Kaizen Project", data.get("project_name"))
    doc.submit_implementation(data)
    return {"success": True}


# ─────────────────────────────────────────────
# 评价相关API
# ─────────────────────────────────────────────
@frappe.whitelist()
def get_pending_evaluate_projects():
    projects = frappe.get_all("Kaizen Project",
        filters={"status": "评价中"},
        fields=["name", "title", "proposal", "kaizen_type",
                "implementation_result", "actual_end_date"],
        order_by="actual_end_date asc"
    )
    return projects


@frappe.whitelist()
def submit_evaluation(data):
    if isinstance(data, str):
        import json
        data = json.loads(data)
    doc = frappe.get_doc("Kaizen Project", data.get("project_name"))
    doc.submit_evaluation(data)
    return {"success": True}


# ─────────────────────────────────────────────
# 报表API
# ─────────────────────────────────────────────
@frappe.whitelist()
def get_my_improvement_report():
    user = frappe.session.user
    data = frappe.db.sql("""
        SELECT
            kpr.name as proposal_name,
            kpr.kaizen_type,
            kpr.status as proposal_status,
            kpr.submitted_date,
            kpj.name as project_name,
            kpj.status as project_status,
            kpj.star_rating,
            kpj.actual_end_date
        FROM `tabKaizen Proposal` kpr
        LEFT JOIN `tabKaizen Project` kpj ON kpj.name = kpr.kaizen_project
        WHERE kpr.submitted_by = %(user)s
        ORDER BY kpr.creation DESC
    """, {"user": user}, as_dict=True)
    return data


@frappe.whitelist()
def get_department_stats():
    data = frappe.db.sql("""
        SELECT
            kpd.department,
            COUNT(DISTINCT kp.name) as total_projects,
            SUM(CASE WHEN kp.status = '已关闭' THEN 1 ELSE 0 END) as closed_projects,
            AVG(kp.star_rating) as avg_rating
        FROM `tabKaizen Project` kp
        JOIN `tabKaizen Project Department` kpd ON kpd.parent = kp.name
        GROUP BY kpd.department
        ORDER BY total_projects DESC
    """, as_dict=True)
    return data


@frappe.whitelist()
def get_type_analysis():
    data = frappe.db.sql("""
        SELECT
            kaizen_type,
            COUNT(*) as proposal_count,
            SUM(CASE WHEN status = '已立项' THEN 1 ELSE 0 END) as approved_count
        FROM `tabKaizen Proposal`
        GROUP BY kaizen_type
        ORDER BY proposal_count DESC
    """, as_dict=True)
    return data


@frappe.whitelist()
def get_excellent_projects():
    data = frappe.get_all("Kaizen Project",
        filters={"star_rating": [">=", 4], "status": "已关闭"},
        fields=["name", "title", "kaizen_type", "star_rating",
                "improvement_target", "implementation_result",
                "actual_end_date", "incentive_measure"],
        order_by="star_rating desc, actual_end_date desc"
    )
    return data


@frappe.whitelist()
def get_kaizen_types():
    return frappe.get_all("Kaizen Type",
        filters={"is_active": 1},
        fields=["name", "type_name"],
        order_by="type_name"
    )


@frappe.whitelist()
def get_learning_list(category=None):
    filters = {}
    if category:
        filters["category"] = category
    return frappe.get_all("Kaizen Learning",
        filters=filters,
        fields=["name", "title", "category", "author", "publish_date",
                "summary", "cover_image", "is_featured"],
        order_by="is_featured desc, publish_date desc"
    )


@frappe.whitelist()
def get_learning_detail(name):
    return frappe.get_doc("Kaizen Learning", name).as_dict()
