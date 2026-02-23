import frappe

def after_install():
    create_default_kaizen_types()

def create_default_kaizen_types():
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
            frappe.get_doc({
                "doctype": "Kaizen Type",
                "type_name": t["type_name"],
                "description": t["description"],
                "is_active": 1
            }).insert(ignore_permissions=True)
    frappe.db.commit()
