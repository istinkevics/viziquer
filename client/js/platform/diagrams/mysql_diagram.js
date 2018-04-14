import CodeMirror from 'codemirror';
import 'codemirror/mode/sql/sql';
import 'codemirror/lib/codemirror.css'; // TODO: import this via css

MySQLEditor = null; // TODO: global variables are bad...

Template.mysqlForm.onRendered(function () {
    MySQLEditor = CodeMirror.fromTextArea(document.getElementById('generated-mysql'), {
        mode: 'text/x-mysql',
        value: Session.get('generatedMySQL'),
        lineNumbers: true,
    });

    MySQLEditor.on('blur', editor => {
        Session.set('generatedMySQL', editor.getValue());
    });
});

Template.mysqlForm.helpers({
    data() {
        const result = Session.get('executedMySQL');
        const rows = Array.isArray(result) ? result : [];
        const header = rows[0] ? Object.keys(rows[0]) : [];

        return {
            header,
            rows: rows.map(row => Object.values(row)),
        };
    },
});

Template.mysqlForm.events({
    'click #reset-mysql': function (e) {
        e.preventDefault();
        Session.set('generatedMySQL', undefined);
        Session.set('executedMySQL', null);
        MySQLEditor.setValue('');
    },

    'click #execute-mysql': function (e) {
        e.preventDefault();
        const query = MySQLEditor.getValue();
        Interpreter.customExtensionPoints.ExecuteMySQL_from_text(query);
    },
});
