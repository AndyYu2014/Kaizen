import frappe

def after_install():
    """安装后初始化基础数据"""
    create_default_kaizen_types()
    create_sample_learning()

def create_default_kaizen_types():
    """创建默认精益类型"""
    types = [
        {"type_name": "5S改善", "description": "整理、整顿、清扫、清洁、素养"},
        {"type_name": "安全改善", "description": "安全隐患消除和预防"},
        {"type_name": "质量改善", "description": "产品或过程质量提升"},
        {"type_name": "效率改善", "description": "生产效率和工作效率提升"},
        {"type_name": "成本改善", "description": "降低生产或运营成本"},
        {"type_name": "环境改善", "description": "工作环境和生态环境改善"},
    ]
    for t in types:
        if not frappe.db.exists("Kaizen Type", t["type_name"]):
            doc = frappe.new_doc("Kaizen Type")
            doc.type_name = t["type_name"]
            doc.description = t["description"]
            doc.is_active = 1
            doc.insert(ignore_permissions=True)
    frappe.db.commit()

def create_sample_learning():
    """创建示例课堂文章"""
    if frappe.db.count("Kaizen Learning") == 0:
        sample = frappe.new_doc("Kaizen Learning")
        sample.title = "精益改善入门：什么是Kaizen？"
        sample.category = "精益工具介绍"
        sample.author = "精益管理团队"
        sample.summary = "Kaizen是日文「改善」的音译，意为持续改进。本文带您了解精益改善的核心理念。"
        sample.content = """
        <h3>什么是Kaizen？</h3>
        <p>Kaizen（改善）是一种以持续改进为核心的管理哲学，起源于日本制造业。
        它强调每个员工都能为组织改进做出贡献，哪怕是微小的改进。</p>
        <h3>Kaizen的核心原则</h3>
        <ul>
          <li>从小处做起，持续改进</li>
          <li>全员参与，不分层级</li>
          <li>以事实为依据，用数据说话</li>
          <li>快速试错，不断优化</li>
        </ul>
        """
        sample.is_featured = 1
        sample.publish_date = frappe.utils.today()
        sample.insert(ignore_permissions=True)
        frappe.db.commit()
