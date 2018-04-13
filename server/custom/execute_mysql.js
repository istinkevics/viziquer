import mysql from 'mysql';
import squel from 'squel';
import { CLIENT_RENEG_LIMIT } from 'tls';

export const query = (connection, shape, sql, fields = {}) =>
    new Promise((resolve, reject) => {
        connection.query(sql, fields, (error, results) => {
            if (error) reject(error);
            resolve({ array: results, object: results[0], _id: results.insertId, boolean: true }[shape]);
        });
    });

Meteor.methods({
    testMySQLProjectEndPoint: function (list) {

        const userId = Meteor.userId();
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
    importMySQLSchema: function (list) {
        // TODO: create generic function for connection

        const connection = mysql.createConnection({
            host: list.dbHostname,
            port: list.dbPort,
            user: list.dbUsername,
            password: list.dbPassword,
            database: list.dbName,
        });

        connection.connect(err => {
            if (err) {
                console.error('Error connecting: ' + err.stack);
                return;
            }
            const select = squel.select()
                .from('information_schema.columns')
                .where(`table_schema = '${list.dbName}'`);

            // TODO: add success/error messages
            query(connection, 'array', select.toString())
                .then(res => {
                    const name = `${list.dbHostname} schema`;
                    const tables = {};
                    res.forEach(attribute => {
                        if (tables[attribute.TABLE_NAME]) {
                            tables[attribute.TABLE_NAME].attributes.push({
                                name: attribute.COLUMN_NAME,
                                type: attribute.DATA_TYPE,
                            });
                        } else {
                            tables[attribute.TABLE_NAME] = {
                                attributes: [
                                    {
                                        name: attribute.COLUMN_NAME,
                                        type: attribute.DATA_TYPE,
                                    }
                                ]
                            };
                        }
                    });

                    const data = { name, tables };
                    const newSchema = {
                        projectId: list.projectId,
                        versionId: list.versionId,
                        data,
                    };
                    Meteor.call('loadMysqlSchema', newSchema);
                });
        });
    },
});
