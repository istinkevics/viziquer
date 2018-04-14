Meteor.methods({
    updateProjectMySQLSettings: function (list) {
        var userId = Meteor.userId();
        console.log(list);
        if (list['projectId'] && is_project_version_admin(userId, list)) {
            Projects.update({ _id: list.projectId }, {
                $set: {
                    dbHostname: list.dbHostname,
                    dbPort: list.dbPort,
                    dbUsername: list.dbUsername,
                    dbPassword: list.dbPassword, // TODO: I should encode this...
                    dbName: list.dbName,
                }
            });
        }
	},
});
