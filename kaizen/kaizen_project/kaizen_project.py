import frappe
from frappe import _
from frappe.model.document import Document
from datetime import datetime


class KaizenProject(Document):

    def validate(self):
        """校验逻辑"""
        if self.star_rating and (self.star_rating < 1 or self.star_rating > 5):
            frappe.throw(_("星级评价必须在 1 到 5 之间"))

        if self.status == "已关闭" and not self.star_rating:
            frappe.throw(_("关闭项目前请先完成星级评价"))

    def on_update(self):
        """状态变更时同步相关提案"""
        if self.status in ("已关闭", "已取消"):
            self._sync_proposal_status()

        # 评价完成，推优秀案例到精益课堂
        if self.star_rating and self.star_rating >= 4 and self.status == "已关闭":
            self._auto_create_learning()

    def _sync_proposal_status(self):
        """同步提案状态"""
        if self.source_proposal:
            proposal = frappe.get_doc("Kaizen Proposal", self.source_proposal)
            if self.status == "已关闭":
                pass  # 提案保持已立项状态
            elif self.status == "已取消":
                proposal.db_set("status", "待提交")

    def _auto_create_learning(self):
        """4星以上自动创建精益课堂草稿"""
        existing = frappe.db.exists("Kaizen Learning", {"source_project": self.name})
        if not existing:
            learning = frappe.new_doc("Kaizen Learning")
            learning.title = f"【优秀案例】{self.project_no}"
            learning.category = "优秀案例"
            learning.source_type = "内部改善项目"
            learning.source_project = self.name
            learning.publish_date = datetime.now().date()
            learning.author = frappe.session.user
            learning.is_published = 0
            learning.content = f"""
<h3>改善项目：{self.project_no}</h3>
<p><strong>改善目标：</strong>{self.improvement_goal or ''}</p>
<p><strong>临时措施：</strong>{self.temporary_measures or ''}</p>
<p><strong>永久措施：</strong>{self.permanent_measures or ''}</p>
<p><strong>实施效果：</strong>{self.implement_result or ''}</p>
<p><strong>星级评价：</strong>{"★" * int(self.star_rating)}</p>
            """
            learning.insert(ignore_permissions=True)


def on_update(doc, method):
    doc.on_update()
