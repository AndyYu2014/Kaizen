import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime, getdate, nowdate

class KaizenProposal(Document):

    def before_insert(self):
        if not self.submitted_by:
            self.submitted_by = frappe.session.user

    def before_save(self):
        if self.status == "已提交" and not self.submitted_date:
            self.submitted_date = now_datetime()

    def on_submit_action(self):
        """员工点击提交时触发"""
        self.status = "已提交"
        self.submitted_date = now_datetime()
        self.save()

    def approve_and_create_project(self, reviewer_data):
        """审核通过，创建改善项目"""
        self.urgency = reviewer_data.get("urgency")
        self.economic_value = reviewer_data.get("economic_value")
        self.quality_impact = reviewer_data.get("quality_impact")
        self.reviewer = frappe.session.user
        self.review_date = now_datetime()
        self.review_comment = reviewer_data.get("review_comment")
        self.improvement_target = reviewer_data.get("improvement_target")
        self.expected_completion_date = reviewer_data.get("expected_completion_date")

        # 创建改善项目
        project = frappe.new_doc("Kaizen Project")
        project.proposal = self.name
        project.kaizen_type = self.kaizen_type
        project.title = f"改善项目-{self.name}"
        project.status = "方案编制中"
        project.urgency = self.urgency
        project.economic_value = self.economic_value
        project.quality_impact = self.quality_impact
        project.improvement_target = self.improvement_target
        project.expected_completion_date = self.expected_completion_date

        # 复制关联部门
        if reviewer_data.get("departments"):
            for dept in reviewer_data["departments"]:
                project.append("implementation_departments", {
                    "department": dept.get("department"),
                    "responsible_person": dept.get("responsible_person"),
                    "role_description": dept.get("role_description"),
                })

        project.insert()

        self.status = "已立项"
        self.kaizen_project = project.name
        self.save()

        return project.name

    def cancel_proposal(self, reason=""):
        """取消提案"""
        self.status = "已取消"
        if reason:
            self.review_comment = f"取消原因: {reason}"
        self.save()
