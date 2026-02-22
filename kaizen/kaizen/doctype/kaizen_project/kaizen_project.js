frappe.ui.form.on('Kaizen Project', {
    refresh: function(frm) {
        if (frm.doc.status === '方案编制中') {
            frm.add_custom_button('提交方案', function() {
                if (!frm.doc.temporary_measure || !frm.doc.permanent_measure) {
                    frappe.msgprint('请填写临时措施和永久措施');
                    return;
                }
                frappe.call({
                    method: 'kaizen.kaizen.api.kaizen_api.submit_plan',
                    args: {
                        data: JSON.stringify({
                            project_name: frm.doc.name,
                            temporary_measure: frm.doc.temporary_measure,
                            permanent_measure: frm.doc.permanent_measure,
                            plan_start_date: frm.doc.plan_start_date,
                            plan_end_date: frm.doc.plan_end_date,
                        })
                    },
                    callback: function(r) {
                        if (r.message && r.message.success) {
                            frappe.msgprint('方案已提交，项目进入实施阶段！');
                            frm.reload_doc();
                        }
                    }
                });
            }, '操作').addClass('btn-primary');
        }
        if (frm.doc.status === '实施中') {
            frm.add_custom_button('提交实施结果', function() {
                frappe.call({
                    method: 'kaizen.kaizen.api.kaizen_api.submit_implementation',
                    args: {
                        data: JSON.stringify({
                            project_name: frm.doc.name,
                            actual_start_date: frm.doc.actual_start_date,
                            actual_end_date: frm.doc.actual_end_date,
                            implementation_result: frm.doc.implementation_result,
                        })
                    },
                    callback: function(r) {
                        if (r.message && r.message.success) {
                            frappe.msgprint('实施结果已提交，进入评价阶段！');
                            frm.reload_doc();
                        }
                    }
                });
            }, '操作').addClass('btn-primary');
        }
        if (frm.doc.status === '评价中') {
            frm.add_custom_button('完成评价', function() {
                let d = new frappe.ui.Dialog({
                    title: '改善评价',
                    fields: [
                        { fieldtype: 'Int', fieldname: 'star_rating', label: '星级评价（1-5）', reqd: 1 },
                        { fieldtype: 'Text', fieldname: 'incentive_measure', label: '激励措施' },
                    ],
                    primary_action: function() {
                        let values = d.get_values();
                        if (values.star_rating < 1 || values.star_rating > 5) {
                            frappe.msgprint('星级必须在1到5之间');
                            return;
                        }
                        values.project_name = frm.doc.name;
                        frappe.call({
                            method: 'kaizen.kaizen.api.kaizen_api.submit_evaluation',
                            args: { data: JSON.stringify(values) },
                            callback: function(r) {
                                if (r.message && r.message.success) {
                                    frappe.msgprint('评价完成，项目已关闭！');
                                    frm.reload_doc();
                                    d.hide();
                                }
                            }
                        });
                    },
                    primary_action_label: '确认评价'
                });
                d.show();
            }, '操作').addClass('btn-success');
        }

        // 显示星级
        if (frm.doc.star_rating) {
            frm.set_intro('⭐'.repeat(frm.doc.star_rating) + ` ${frm.doc.star_rating}星评价`);
        }
    }
});
