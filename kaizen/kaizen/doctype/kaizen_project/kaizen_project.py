import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime

class KaizenProject(Document):

    def validate(self):
        if self.star_rating and (self.star_rating < 1 or self.star_rating > 5):
            frappe.throw("星级评价必须在1到5之间")

    def submit_plan(self, plan_data):
        """提交改善方案"""
        self.temporary_measure = plan_data.get("temporary_measure")
        self.permanent_measure = plan_data.get("permanent_measure")
        self.plan_start_date = plan_data.get("plan_start_date")
        self.plan_end_date = plan_data.get("plan_end_date")
        if plan_data.get("departments"):
            self.implementation_departments = []
            for dept in plan_data["departments"]:
                self.append("implementation_departments", {
                    "department": dept.get("department"),
                    "responsible_person": dept.get("responsible_person"),
                    "role_description": dept.get("role_description"),
                })
        self.status = "实施中"
        self.save()

    def submit_implementation(self, impl_data):
        """提交实施结果"""
        self.actual_start_date = impl_data.get("actual_start_date")
        self.actual_end_date = impl_data.get("actual_end_date")
        self.implementation_result = impl_data.get("implementation_result")
        self.status = "评价中"
        self.save()

    def submit_evaluation(self, eval_data):
        """提交评价"""
        self.star_rating = eval_data.get("star_rating")
        self.incentive_measure = eval_data.get("incentive_measure")
        self.evaluator = frappe.session.user
        self.evaluate_date = now_datetime()
        self.status = "已关闭"
        self.save()

        # 同步更新关联提案
        if self.proposal:
            frappe.db.set_value("Kaizen Proposal", self.proposal, "status", "已立项")
