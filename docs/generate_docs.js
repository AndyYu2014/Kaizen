const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Footer, Header
} = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 32, font: "Arial" })],
    spacing: { before: 320, after: 160 }
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 26, color: "1677FF", font: "Arial" })],
    spacing: { before: 240, after: 120 }
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, bold: true, size: 22, font: "Arial" })],
    spacing: { before: 160, after: 80 }
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: "Arial", ...opts })],
    spacing: { after: 100 }
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun({ text, size: 22, font: "Arial" })],
    spacing: { after: 60 }
  });
}
function tableRow(cells, isHeader = false) {
  return new TableRow({
    children: cells.map((c, i) => new TableCell({
      borders,
      margins: cellMargins,
      shading: isHeader ? { fill: "1677FF", type: ShadingType.CLEAR } : undefined,
      width: { size: i === 0 ? 2500 : 4000, type: WidthType.DXA },
      children: [new Paragraph({
        children: [new TextRun({
          text: c, size: isHeader ? 20 : 20, bold: isHeader,
          color: isHeader ? "FFFFFF" : "333333", font: "Arial"
        })]
      })]
    }))
  });
}
function makeTable(headers, rows) {
  const totalW = headers.length === 2 ? 6500 : 9360;
  const colW = headers.length === 2 ? [2500, 4000] : [2000, 2500, 2500, 2360];
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: colW,
    rows: [
      new TableRow({
        children: headers.map((h, i) => new TableCell({
          borders,
          margins: cellMargins,
          shading: { fill: "1677FF", type: ShadingType.CLEAR },
          width: { size: colW[i], type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20, font: "Arial" })] })]
        }))
      }),
      ...rows.map(row => new TableRow({
        children: row.map((cell, i) => new TableCell({
          borders,
          margins: cellMargins,
          width: { size: colW[i], type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20, font: "Arial" })] })]
        }))
      }))
    ]
  });
}
function space() { return new Paragraph({ children: [], spacing: { after: 120 } }); }

// ── 功能说明文档 ──────────────────────────────────
const funcDoc = new Document({
  numbering: {
    config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: "Arial", color: "1A1A1A" }, paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: "1677FF" }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, font: "Arial", color: "333333" }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children: [
      // 封面
      new Paragraph({ children: [new TextRun({ text: "", size: 72 })], spacing: { after: 2000 } }),
      new Paragraph({ children: [new TextRun({ text: "精益管理模块", bold: true, size: 56, font: "Arial", color: "1677FF" })], alignment: AlignmentType.CENTER }),
      new Paragraph({ children: [new TextRun({ text: "功能说明文档", bold: true, size: 40, font: "Arial" })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 } }),
      new Paragraph({ children: [new TextRun({ text: "版本：v1.0  |  适用系统：ERPNext 16", size: 22, font: "Arial", color: "888888" })], alignment: AlignmentType.CENTER }),
      new Paragraph({ children: [new TextRun({ text: `发布日期：${new Date().toLocaleDateString("zh-CN")}`, size: 22, font: "Arial", color: "888888" })], alignment: AlignmentType.CENTER, spacing: { before: 100 } }),
      space(), space(),

      h1("1. 模块概述"),
      p("精益管理模块是基于 ERPNext 开发的移动端精益改善管理系统，运行于企业微信内置浏览器中。员工通过手机提交改善提案，管理层审核后创建改善项目，相关部门负责实施，最终进行效果评价和激励，形成完整的 PDCA 改善闭环。"),
      space(),

      h2("1.1 核心流程"),
      p("员工提交改善提案 → 管理层审核（通过/拒绝）→ 创建改善项目 → 编制改善方案 → 改善实施 → 效果评价 → 发放激励 → 优秀案例推送精益课堂"),
      space(),

      h2("1.2 用户角色"),
      makeTable(["角色", "权限说明"], [
        ["所有员工", "提交改善提案、查看自己的提案和项目、查看精益课堂"],
        ["System Manager", "审核提案、创建改善项目、编制方案、进行评价、管理主数据"],
      ]),
      space(),

      h1("2. 数据对象说明"),
      h2("2.1 改善提案（Kaizen Proposal）"),
      p("员工在现场发现问题后提交的初始改善想法。编号规则：KP-YYYYMMDD-XXXX（例：KP-20260222-0001）"),
      makeTable(["状态", "说明"], [
        ["待提交", "员工创建但尚未提交的草稿状态"],
        ["已提交", "员工点击提交后，等待管理层审核"],
        ["已立项", "审核通过，系统自动创建关联改善项目"],
        ["已取消", "审核被拒绝或员工主动取消"],
      ]),
      space(),

      h2("2.2 改善项目（Kaizen Project）"),
      p("审核通过后由系统自动创建的正式改善立项。编号规则：KZ-YYYYMMDD-XX（例：KZ-20260222-01）"),
      makeTable(["状态", "说明"], [
        ["方案编制中", "已立项，等待相关部门制定改善方案"],
        ["实施中", "方案已批准，进入实际改善实施阶段"],
        ["评价中", "实施完毕，等待管理层进行效果评价"],
        ["已关闭", "评价完成，改善项目正式关闭"],
        ["已取消", "因故取消的改善项目"],
      ]),
      space(),

      h1("3. 功能页面说明"),
      h2("3.1 精益管理首页"),
      p("首页提供以下信息和快捷入口："),
      bullet("改善趋势图：展示近3个月的改善提案和项目数量折线图"),
      bullet("我的提案：当前用户提交的活跃提案数量"),
      bullet("待处理事项：需要当前用户操作的事项总数（含审核/方案编制/实施/评价）"),
      bullet("我的改善项目：与我相关的未关闭改善项目数"),
      bullet("改善提案入口：新建和查看提案"),
      bullet("精益推进入口：提案审核、方案编制、改善实施、改善评价"),
      bullet("精益报表：我的改善、部门统计、进度看板、优秀改善榜"),
      bullet("精益小课堂：精益学习文章和优秀案例"),
      space(),

      h2("3.2 改善提案"),
      h3("3.2.1 提案列表"),
      p("展示当前用户提交的提案，默认不显示已立项和已取消的提案。每条提案卡片显示：提案编号、类型、状态、关联项目编号和项目状态、实施部门（如已立项）。"),
      space(),
      h3("3.2.2 新建提案"),
      p("新建提案页面包含以下功能："),
      bullet("拍照/录视频/添加附件：方便员工记录现场情况"),
      bullet("精益类型（必填）：下拉选择精益类型"),
      bullet("位置信息：可选择产线、设备、仓库、物料"),
      bullet("语音备注：通过企业微信键盘语音键输入，文字自动填入文本框"),
      bullet("待改善现象（必填）：详细描述发现的问题"),
      bullet("方案提案（可选）：填写初步建议方案"),
      bullet("保存草稿：暂存提案，稍后继续编辑"),
      bullet("提交：提交给管理层审核"),
      space(),

      h2("3.3 提案审核（管理层）"),
      p("展示所有状态为【已提交】的提案，管理层可对每条提案进行："),
      bullet("评估：紧迫性、经济性、质量影响（各低/中/高）"),
      bullet("填写改善目标（人/物/财）"),
      bullet("指定项目负责人和预期完成日期"),
      bullet("添加实施部门（支持多部门，每个部门可指定负责人和职责）"),
      bullet("通过并立项：自动创建改善项目，提案状态更新为已立项"),
      bullet("拒绝：填写拒绝原因，提案状态更新为已取消"),
      space(),

      h2("3.4 改善方案编制（管理层）"),
      p("对状态为【方案编制中】的改善项目进行方案制定："),
      bullet("录入临时更改措施（应急处理）"),
      bullet("录入永久解决措施（根本解决方案）"),
      bullet("录入计划开始和完成日期"),
      bullet("管理实施部门清单（可新增/删除，支持多部门）"),
      bullet("提交后项目进入【实施中】状态"),
      space(),

      h2("3.5 改善实施（实施人员）"),
      p("对状态为【实施中】的改善项目录入实施结果："),
      bullet("拍照/录视频：记录实施过程和效果"),
      bullet("录入实际开始日期"),
      bullet("录入实施效果描述"),
      bullet("提交后项目进入【评价中】状态"),
      space(),

      h2("3.6 改善评价（管理层）"),
      p("对状态为【评价中】的改善项目进行效果评价："),
      bullet("五星评价：1-5星，点击星星选择评分"),
      bullet("录入激励措施（积分/奖励等）"),
      bullet("确认评价：项目关闭，记录完成日期"),
      bullet("4星以上：系统自动在精益课堂中创建草稿文章，待管理员发布"),
      space(),

      h2("3.7 精益小课堂"),
      p("学习内容库，包含优秀案例、外部企业案例、精益知识和网络文章："),
      bullet("分类筛选：全部/优秀案例/外部案例/精益知识/网络文章"),
      bullet("卡片展示：封面图、分类标签、标题、发布时间、浏览次数"),
      bullet("点击查看详情，自动记录浏览次数"),
      space(),

      h2("3.8 精益报表"),
      makeTable(["报表名称", "说明"], [
        ["我的改善", "当前用户提交的所有提案明细及状态统计"],
        ["部门统计", "各部门参与的改善项目数、完成数、平均星级"],
        ["进度看板", "全公司提案和项目的各状态数量汇总"],
        ["优秀改善榜", "4星以上已完成项目列表，按星级排列"],
      ]),
      space(),

      h1("4. 自动化规则"),
      bullet("提案审核通过后，系统自动生成改善项目，编号格式 KZ-YYYYMMDD-XX"),
      bullet("改善项目评价达到4星或以上，系统自动在精益课堂创建草稿文章"),
      bullet("每日定时检查即将超期的改善项目，发送邮件提醒项目负责人"),
    ]
  }]
});

// ── 技术文档 ──────────────────────────────────────
const techDoc = new Document({
  numbering: {
    config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: "Arial", color: "1A1A1A" }, paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: "1677FF" }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, font: "Arial", color: "333333" }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children: [
      new Paragraph({ children: [new TextRun({ text: "", size: 72 })], spacing: { after: 2000 } }),
      new Paragraph({ children: [new TextRun({ text: "精益管理模块", bold: true, size: 56, font: "Arial", color: "1677FF" })], alignment: AlignmentType.CENTER }),
      new Paragraph({ children: [new TextRun({ text: "技术文档 & 部署手册", bold: true, size: 40, font: "Arial" })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 } }),
      new Paragraph({ children: [new TextRun({ text: "版本：v1.0  |  适用环境：ERPNext 16 + Ubuntu 22.04", size: 22, font: "Arial", color: "888888" })], alignment: AlignmentType.CENTER }),
      space(), space(),

      h1("1. 技术架构"),
      h2("1.1 技术栈"),
      makeTable(["层次", "技术"], [
        ["后端框架", "Frappe Framework v15（ERPNext 16 底层）"],
        ["后端语言", "Python 3.14"],
        ["前端", "原生 HTML5 / CSS3 / JavaScript（无额外框架依赖）"],
        ["数据库", "MariaDB（Frappe 默认）"],
        ["运行环境", "Ubuntu 22.04 LTS"],
        ["运行客户端", "企业微信内置浏览器（WebView）"],
      ]),
      space(),

      h2("1.2 应用目录结构"),
      p("kaizen/                          # App 根目录"),
      p("├── setup.py                     # Python 包配置"),
      p("├── requirements.txt             # 依赖清单"),
      p("├── deploy.sh                    # 部署脚本"),
      p("└── kaizen/                      # 主模块目录"),
      p("    ├── __init__.py              # 版本号"),
      p("    ├── hooks.py                 # 核心配置（路由/事件/权限）"),
      p("    ├── api/"),
      p("    │   └── kaizen_api.py        # 所有 API 接口"),
      p("    ├── kaizen_type/             # 精益类型 DocType"),
      p("    ├── kaizen_proposal/         # 改善提案 DocType"),
      p("    ├── kaizen_project/          # 改善项目 DocType"),
      p("    ├── kaizen_project_department/ # 实施部门子表"),
      p("    ├── kaizen_learning/         # 精益课堂 DocType"),
      p("    ├── fixtures/"),
      p("    │   └── kaizen_type.json     # 初始精益类型数据"),
      p("    └── public/"),
      p("        ├── css/kaizen-mobile.css # 移动端样式"),
      p("        ├── js/kaizen-utils.js   # 工具函数"),
      p("        └── html/               # 各移动端页面"),
      space(),

      h1("2. 数据库设计"),
      h2("2.1 DocType 列表"),
      makeTable(["DocType 名称", "数据库表名", "说明"], [
        ["Kaizen Type", "tabKaizen Type", "精益类型主数据"],
        ["Kaizen Proposal", "tabKaizen Proposal", "改善提案"],
        ["Kaizen Project", "tabKaizen Project", "改善项目"],
        ["Kaizen Project Department", "tabKaizen Project Department", "实施部门子表（从属于改善项目）"],
        ["Kaizen Learning", "tabKaizen Learning", "精益课堂文章"],
      ]),
      space(),

      h2("2.2 改善提案主要字段"),
      makeTable(["字段名", "类型", "说明"], [
        ["name", "Data", "主键，格式 KP-YYYYMMDD-XXXX"],
        ["kaizen_type", "Link→Kaizen Type", "精益类型（必填）"],
        ["status", "Select", "待提交/已提交/已立项/已取消"],
        ["submitted_by", "Link→User", "提交人，自动填充"],
        ["submitted_date", "Datetime", "提交时间，自动填充"],
        ["production_line", "Link→Workstation", "产线（可选）"],
        ["equipment", "Link→Asset", "设备（可选）"],
        ["warehouse", "Link→Warehouse", "仓库（可选）"],
        ["item", "Link→Item", "物料（可选）"],
        ["voice_notes", "Small Text", "语音转文字备注"],
        ["phenomenon_description", "Long Text", "待改善现象（必填）"],
        ["suggestion_description", "Long Text", "建议方案（可选）"],
        ["kaizen_project", "Link→Kaizen Project", "关联改善项目（审核通过后自动填充）"],
        ["reviewer", "Link→User", "审核人"],
        ["cancel_reason", "Small Text", "取消原因"],
      ]),
      space(),

      h2("2.3 改善项目主要字段"),
      makeTable(["字段名", "类型", "说明"], [
        ["name", "Data", "主键，格式 KZ-YYYYMMDD-XX"],
        ["source_proposal", "Link→Kaizen Proposal", "来源提案"],
        ["kaizen_type", "Link→Kaizen Type", "精益类型"],
        ["status", "Select", "方案编制中/实施中/评价中/已关闭/已取消"],
        ["urgency", "Select", "紧迫性：低/中/高"],
        ["economic_impact", "Select", "经济性：低/中/高"],
        ["quality_impact", "Select", "质量影响：低/中/高"],
        ["improvement_goal", "Long Text", "改善目标"],
        ["departments", "Table→Kaizen Project Department", "实施部门子表（多部门）"],
        ["temporary_measures", "Long Text", "临时更改措施"],
        ["permanent_measures", "Long Text", "永久解决措施"],
        ["actual_start_date", "Date", "实际开始日期"],
        ["implement_result", "Long Text", "实施效果描述"],
        ["star_rating", "Int", "星级评价 1-5"],
        ["incentive_measures", "Long Text", "激励措施"],
      ]),
      space(),

      h1("3. API 接口说明"),
      h2("3.1 接口列表"),
      makeTable(["接口方法", "功能"], [
        ["get_home_stats", "获取首页统计数据（我的提案数/待处理数/我的项目数）"],
        ["get_trend_data", "获取近3个月趋势数据（用于折线图）"],
        ["get_my_proposals", "获取我的提案列表"],
        ["save_proposal", "新建或更新改善提案"],
        ["cancel_proposal", "取消提案"],
        ["get_proposals_for_review", "获取待审核提案列表（管理层）"],
        ["approve_proposal", "审核通过并创建改善项目"],
        ["reject_proposal", "拒绝提案"],
        ["get_projects_for_plan", "获取待编制方案的项目列表"],
        ["save_project_plan", "保存改善方案"],
        ["get_projects_for_implement", "获取实施中的项目列表"],
        ["save_implement_result", "保存实施结果"],
        ["get_projects_for_evaluate", "获取待评价的项目列表"],
        ["save_evaluation", "保存评价结果"],
        ["get_learning_list", "获取精益课堂文章列表"],
        ["get_learning_detail", "获取文章详情（自动记录浏览量）"],
        ["get_my_report", "我的改善报表"],
        ["get_department_report", "部门改善统计报表"],
        ["get_status_dashboard", "进度看板数据"],
        ["get_excellent_list", "优秀改善榜（4星以上）"],
      ]),
      space(),
      p("所有 API 均通过 Frappe 的 @frappe.whitelist() 装饰器暴露，调用方式为："),
      p("frappe.call({ method: 'kaizen.api.kaizen_api.<方法名>', args: { ... } })"),
      space(),

      h1("4. 部署手册"),
      h2("4.1 环境要求"),
      makeTable(["组件", "要求"], [
        ["操作系统", "Ubuntu 22.04 LTS"],
        ["ERPNext", "Version 16（Frappe v15）"],
        ["Python", "3.14+"],
        ["数据库", "MariaDB 10.6+"],
        ["Node.js", "18+（bench 依赖）"],
      ]),
      space(),

      h2("4.2 部署步骤"),
      h3("步骤 1：上传应用包"),
      p("将 kaizen_app 目录上传到服务器，例如："),
      p("scp -r ./kaizen_app frappe@your-server:/tmp/kaizen_app"),
      space(),
      h3("步骤 2：执行部署脚本"),
      p("1. 编辑 deploy.sh，修改 BENCH_PATH 和 SITE_NAME 为实际值"),
      p("2. 执行脚本："),
      p("   ssh frappe@your-server"),
      p("   cd /tmp/kaizen_app"),
      p("   chmod +x deploy.sh"),
      p("   ./deploy.sh"),
      space(),
      h3("步骤 3：验证安装"),
      p("打开浏览器访问：http://your-site.local/kaizen-home"),
      p("检查后台是否出现以下 DocType：Kaizen Type / Kaizen Proposal / Kaizen Project / Kaizen Learning"),
      space(),
      h3("步骤 4：初始配置"),
      p("1. 进入后台 → Kaizen Type，可增减精益类型"),
      p("2. 进入后台 → Kaizen Learning，可新增精益课堂文章"),
      p("3. 为需要审核权限的人员添加 System Manager 角色"),
      space(),

      h2("4.3 企业微信集成"),
      bullet("将精益管理首页 URL（http://your-site.local/kaizen-home）配置到企业微信应用的菜单或消息链接"),
      bullet("确保服务器防火墙已开放 80/443 端口"),
      bullet("建议配置 HTTPS（可使用 Let's Encrypt），企业微信要求 HTTPS"),
      bullet("bench --site your-site.local setup-nginx 并配置 SSL"),
      space(),

      h2("4.4 常见问题"),
      makeTable(["问题", "解决方法"], [
        ["页面显示 403", "检查用户是否已登录 ERPNext，或检查权限配置"],
        ["API 调用失败", "检查 CSRF Token，确认 frappe.csrf_token 正常获取"],
        ["附件上传失败", "检查 /api/method/upload_file 接口权限，确认 files 目录可写"],
        ["样式未生效", "执行 bench build --app kaizen 重新构建静态资源"],
        ["数据库字段缺失", "执行 bench --site your-site migrate 重新迁移"],
      ]),
      space(),

      h1("5. 维护说明"),
      h2("5.1 日志查看"),
      p("bench --site your-site.local logs"),
      p("tail -f /home/frappe/frappe-bench/logs/worker.error.log"),
      space(),
      h2("5.2 更新应用"),
      p("修改代码后，执行："),
      p("bench --site your-site.local migrate"),
      p("bench build --app kaizen"),
      p("bench restart"),
      space(),
      h2("5.3 备份数据"),
      p("bench --site your-site.local backup --with-files"),
    ]
  }]
});

// 生成文件
async function generate() {
  const funcBuf = await Packer.toBuffer(funcDoc);
  fs.writeFileSync('/home/claude/kaizen_app/docs/精益管理_功能说明文档.docx', funcBuf);
  console.log("功能说明文档生成完成");

  const techBuf = await Packer.toBuffer(techDoc);
  fs.writeFileSync('/home/claude/kaizen_app/docs/精益管理_技术与部署文档.docx', techBuf);
  console.log("技术与部署文档生成完成");
}

generate().catch(console.error);
