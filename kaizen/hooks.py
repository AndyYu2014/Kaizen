app_name = "kaizen"
app_title = "精益管理"
app_publisher = "Your Company"
app_description = "精益管理移动端模块"
app_email = "admin@yourcompany.com"
app_license = "MIT"

# 应用图标（安装后在首页显示）
add_to_apps_screen = [
    {
        "name": "kaizen",
        "logo": "/assets/kaizen/images/kaizen-logo.png",
        "title": "精益",
        "route": "/kaizen-home",
    }
]

app_include_css = ["/assets/kaizen/css/kaizen.css"]
app_include_js = ["/assets/kaizen/js/kaizen.js"]

# 网站路由
website_route_rules = [
    {"from_route": "/kaizen-home", "to_route": "kaizen_home"},
    {"from_route": "/kaizen-proposal", "to_route": "kaizen_proposal_list"},
    {"from_route": "/kaizen-proposal-new", "to_route": "kaizen_proposal_form"},
    {"from_route": "/kaizen-proposal/<n>", "to_route": "kaizen_proposal_form"},
    {"from_route": "/kaizen-review", "to_route": "kaizen_review_list"},
    {"from_route": "/kaizen-review/<n>", "to_route": "kaizen_review_form"},
    {"from_route": "/kaizen-plan/list", "to_route": "kaizen_plan_form"},
    {"from_route": "/kaizen-plan/<n>", "to_route": "kaizen_plan_form"},
    {"from_route": "/kaizen-implement/list", "to_route": "kaizen_implement_form"},
    {"from_route": "/kaizen-implement/<n>", "to_route": "kaizen_implement_form"},
    {"from_route": "/kaizen-evaluate", "to_route": "kaizen_evaluate_list"},
    {"from_route": "/kaizen-evaluate/<n>", "to_route": "kaizen_evaluate_form"},
    {"from_route": "/kaizen-learning", "to_route": "kaizen_learning_list"},
    {"from_route": "/kaizen-report", "to_route": "kaizen_report"},
]

# 安装后执行
after_install = "kaizen.setup.after_install"
