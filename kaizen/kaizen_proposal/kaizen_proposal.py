import frappe
from frappe import _
from frappe.model.document import Document
from datetime import datetime


class KaizenProposal(Document):

    def before_insert(self):
        """新建时自动填充提交人和时间"""
        if not self.submitted_by:
            self.submitted_by = frappe.session.user
        if not self.submitted_date:
            self.submitted_date = datetime.now()
        if not self.status:
            self.status = "待提交"

    def validate(self):
        """校验逻辑"""
        if not self.kaizen_type:
            frappe.throw(_("精益类型为必填项"))
        if not self.phenomenon_description:
            frappe.throw(_("待改善现象描述为必填项"))

    def on_submit(self):
        """提交后更新状态"""
        if self.status == "待提交":
            self.db_set("status", "已提交")


def on_submit(doc, method):
    doc.db_set("status", "已提交")
