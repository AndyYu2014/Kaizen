frappe.ui.form.on('Kaizen Proposal', {
    refresh: function(frm) {
        if (frm.doc.status === '待提交') {
            frm.add_custom_button('提交提案', function() {
                frappe.call({
                    method: 'kaizen.kaizen.api.kaizen_api.submit_proposal',
                    args: { proposal_name: frm.doc.name },
                    callback: function(r) {
                        if (r.message && r.message.success) {
                            frappe.msgprint('提案已提交！');
                            frm.reload_doc();
                        }
                    }
                });
            }, '操作').addClass('btn-primary');
        }
        if (frm.doc.status === '已提交') {
            frm.add_custom_button('通过并立项', function() {
                // 打开审核对话框
                let d = new frappe.ui.Dialog({
                    title: '审核提案',
                    fields: [
                        { fieldtype: 'Select', fieldname: 'urgency', label: '紧迫性', options: '\n低\n中\n高', reqd: 1 },
                        { fieldtype: 'Select', fieldname: 'economic_value', label: '经济性', options: '\n低\n中\n高', reqd: 1 },
                        { fieldtype: 'Select', fieldname: 'quality_impact', label: '质量影响', options: '\n低\n中\n高', reqd: 1 },
                        { fieldtype: 'Text', fieldname: 'improvement_target', label: '预期改进目标' },
                        { fieldtype: 'Date', fieldname: 'expected_completion_date', label: '预期完成日期' },
                        { fieldtype: 'Text', fieldname: 'review_comment', label: '审核意见' },
                    ],
                    primary_action: function() {
                        let values = d.get_values();
                        values.proposal_name = frm.doc.name;
                        frappe.call({
                            method: 'kaizen.kaizen.api.kaizen_api.approve_proposal',
                            args: { data: JSON.stringify(values) },
                            callback: function(r) {
                                if (r.message) {
                                    frappe.msgprint('已立项，改善项目编号：' + r.message.project_name);
                                    frm.reload_doc();
                                    d.hide();
                                }
                            }
                        });
                    },
                    primary_action_label: '确认通过'
                });
                d.show();
            }, '操作').addClass('btn-success');

            frm.add_custom_button('拒绝提案', function() {
                frappe.prompt('拒绝原因', function(values) {
                    frappe.call({
                        method: 'kaizen.kaizen.api.kaizen_api.reject_proposal',
                        args: { proposal_name: frm.doc.name, reason: values.value },
                        callback: function() { frm.reload_doc(); }
                    });
                }, '拒绝确认');
            }, '操作').addClass('btn-danger');
        }
    }
});
