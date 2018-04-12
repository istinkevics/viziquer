import mysql from 'mysql';

Meteor.methods({
    testMySQLProjectEndPoint: function (list) {

        var userId = Meteor.userId();
        if (is_project_member(userId, list)) {

            if (!list.dbHostname || !list.dbPort || !list.dbUsername || !list.dbPassword || !list.dbName) {
                console.error('No data specified', list);
                return { status: 500 };
            }

            const connection = mysql.createConnection({
                host: list.dbHostname,
                port: list.dbPort,
                user: list.dbUsername,
                password: list.dbPassword,
                database: list.dbName,
            });

            Future = Npm.require('fibers/future');
            const future = new Future();

            try {
                connection.connect(err => {
                    if (err) {
                        console.error('Error connecting: ' + err.stack);
                        future.return({ status: 500 });
                        return;
                    }

                    console.log('Connected as id ' + connection.threadId);
                    connection.destroy();
                    future.return({ status: 200 });
                });

            } catch (ex) {
                future.return({ status: 500 });
            };

            return future.wait();
        }
    },
});
