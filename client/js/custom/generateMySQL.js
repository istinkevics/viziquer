import squel from 'squel';
import { forAbstractQueryTable, generateIds } from './generateSPARQL_jo';

Interpreter.customMethods({
    // These method can be called by ajoo editor, e.g., context menu

    ExecuteSPARQL_from_diagram: function () {
        // get _id of the active ajoo diagram
        var diagramId = Session.get("activeDiagram");

        // get an array of ajoo Elements whithin the active diagram
        var elems_in_diagram_ids = Elements.find({ diagramId: diagramId }).map(function (e) {
            return e["_id"]
        });

        var queries = genAbstractQueryForElementList(elems_in_diagram_ids);
        // ErrorHandling - just one query at a moment allowed
        if (queries.length == 0) {
            Interpreter.showErrorMsg("No queries found.", -3);
            return;
        } else if (queries.length > 1) {
            Interpreter.showErrorMsg("More than one query found. #1", -3);
            return;
        };
        _.each(queries, function (q) {
            //console.log(JSON.stringify(q,null,2));
            var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
            var rootClass = abstractQueryTable["root"];
            var result = generateMySQLtext(abstractQueryTable);
            console.log(result["MySQLQuery"]);
            Session.set('generatedMySQL', result["MySQLQuery"]);
            setTextInMySQLEditor(result["MySQLQuery"]);

            if (result["blocking"] != true) executeSparqlString(result["MySQLQuery"]);
        })
    },

    ExecuteMySQL_from_selection: function () {
        const editor = Interpreter.editor;
        const elem_ids = _.keys(editor.getSelectedElements());

        const queries = genAbstractQueryForElementList(elem_ids);
        // ErrorHandling - just one query at a moment allowed
        if (queries.length === 0) {
            Interpreter.showErrorMsg("No queries found.", -3);
            return;
        } else if (queries.length > 1) {
            Interpreter.showErrorMsg("More than one query found. #2", -3);
            return;
        };
        _.each(queries, function (q) {
            const abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
            const rootClass = abstractQueryTable['root'];
            const result = generateMySQLtext(abstractQueryTable);
            console.log(result['MySQLQuery']);
            Session.set('generatedMySQL', result['MySQLQuery']);
            setTextInMySQLEditor(result['MySQLQuery']);

            if (result["blocking"] != true) executeMySQLString(result["MySQLQuery"]);
        })
    },

    ExecuteSPARQL_from_component: function () {
        var editor = Interpreter.editor;
        var elem = _.keys(editor.getSelectedElements());

        //TODO: Code optimization needed - this block copied ...
        if (elem) {
            var selected_elem = new VQ_Element(elem[0]);
            var visited_elems = {};

            function GetComponentIds(vq_elem) {
                visited_elems[vq_elem._id()] = true;
                _.each(vq_elem.getLinks(), function (link) {
                    if (!visited_elems[link.link._id()]) {
                        visited_elems[link.link._id()] = true;
                        var next_el = null;
                        if (link.start) {
                            next_el = link.link.getStartElement();
                        } else {
                            next_el = link.link.getEndElement();
                        };
                        if (!visited_elems[next_el._id()]) {
                            GetComponentIds(next_el);
                        };
                    };
                });
            };

            GetComponentIds(selected_elem);

            var elem_ids = _.keys(visited_elems);

            var queries = genAbstractQueryForElementList(elem_ids);
            // ErrorHandling - just one query at a moment allowed
            if (queries.length == 0) {
                Interpreter.showErrorMsg("No queries found.", -3);
                return;
            } else if (queries.length > 1) {
                Interpreter.showErrorMsg("More than one query found. #3", -3);
                return;
            };
            _.each(queries, function (q) {
                //console.log(JSON.stringify(q,null,2));
                var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
                var rootClass = abstractQueryTable["root"];
                var result = generateMySQLtext(abstractQueryTable);
                console.log(result["MySQLQuery"]);

                Session.set('generatedMySQL', result["MySQLQuery"]);
                setTextInMySQLEditor(result["MySQLQuery"]);

                if (result["blocking"] != true) executeSparqlString(result["MySQLQuery"]);
            })
        } else {
            // nothing selected
        }
    },

    GenerateMySQL_from_selection: function () {
        // get _id-s of selected elements - it serves as potential root Classes
        // and as allowed elements
        var editor = Interpreter.editor;
        var elem_ids = _.keys(editor.getSelectedElements());

        GenerateMySQLForIds(elem_ids)
    },

    GenerateMySQL_from_component: function () {
        var editor = Interpreter.editor;
        var elem = _.keys(editor.getSelectedElements());

        // now we should find the connected classes ...
        if (elem) {
            var selected_elem = new VQ_Element(elem[0]);
            var visited_elems = {};

            function GetComponentIds(vq_elem) {
                visited_elems[vq_elem._id()] = true;
                _.each(vq_elem.getLinks(), function (link) {
                    if (!visited_elems[link.link._id()]) {
                        visited_elems[link.link._id()] = true;
                        var next_el = null;
                        if (link.start) {
                            next_el = link.link.getStartElement();
                        } else {
                            next_el = link.link.getEndElement();
                        };
                        if (!visited_elems[next_el._id()]) {
                            GetComponentIds(next_el);
                        };
                    };
                });
            };

            GetComponentIds(selected_elem);

            var elem_ids = _.keys(visited_elems);
            GenerateMySQLForIds(elem_ids);
        } else {
            // nothing selected
        }

    },
    GenerateSPARQL_from_diagram: function () {
        // get _id of the active ajoo diagram
        var diagramId = Session.get("activeDiagram");

        // get an array of ajoo Elements whithin the active diagram
        var elems_in_diagram_ids = Elements.find({ diagramId: diagramId }).map(function (e) {
            return e["_id"]
        });

        GenerateMySQLForIds(elems_in_diagram_ids)
    },

    GenerateSPARQL_from_diagram_for_all_queries: function () {
        // get _id of the active ajoo diagram
        var diagramId = Session.get("activeDiagram");

        // get an array of ajoo Elements whithin the active diagram
        var elems_in_diagram_ids = Elements.find({ diagramId: diagramId }).map(function (e) {
            return e["_id"]
        });

        GenerateSPARQL_for_all_queries(elems_in_diagram_ids)
    },

    ExecuteMySQL_from_text: function (query) {
        executeMySQLString(query);
    },
});


// Generate MySQL for given ids
function GenerateMySQLForIds(ids) {
    Interpreter.destroyErrorMsg();
    var queries = genAbstractQueryForElementList(ids);

    // ErrorHandling - just one query at a moment allowed
    if (queries.length == 0) {
        Interpreter.showErrorMsg("No queries found.", -3);
        return;
    } else if (queries.length > 1) {
        Interpreter.showErrorMsg("More than one query found. #4", -3);
        return;
    };

    // Goes through all queries found within the list of VQ element ids
    _.each(queries, function (q) {
        var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
        var rootClass = abstractQueryTable["root"];
        var result = generateMySQLtext(abstractQueryTable);

        Session.set('generatedMySQL', result["MySQLQuery"]);
        setTextInMySQLEditor(result["MySQLQuery"]);

        $('#vq-tab a[href="#sparql"]').tab('show');
        // Interpreter.destroyErrorMsg();
    })
}

// Executes the given MySQL query end shows result in the GUI
function executeMySQLString(query) {
    const proj = Projects.findOne({ _id: Session.get('activeProject') });
    const list = {
        projectId: Session.get('activeProject'),
        versionId: Session.get('versionId'),
        query,
        dbHostname: proj.dbHostname,
        dbPort: proj.dbPort,
        dbUsername: proj.dbUsername,
        dbPassword: proj.dbPassword,
        dbName: proj.dbName,
    };
    Utilities.callMeteorMethod('executeMysql', list, function (res) {
        if (res.status == 200) {
            Session.set('executedMySQL', res.result);
            Interpreter.destroyErrorMsg();
            $('#vq-tab a[href="#executed"]').tab('show');
        } else {
            Session.set('executedMySQL', null);

            if (res.status == 503) {
                Interpreter.showErrorMsg('MySQL execution failed: most probably the endpoint is not reachable.', -3)
            } else if (res.status == 504) {
                Interpreter.showErrorMsg('MySQL execution results unreadable.', -3)
            } else {
                const msg = res.error && res.error.response ? `: ${res.error.response.content}` : '.';
                Interpreter.showErrorMsg(`MySQL execution failed${msg}`, -3);
            };

        }
    })
}


// generate SPARQL for all queries
function GenerateSPARQL_for_all_queries(list_of_ids) {
    Interpreter.destroyErrorMsg();
    var queries = genAbstractQueryForElementList(list_of_ids);

    // goes through all queries found within the list of VQ element ids
    _.each(queries, function (q) {
        //console.log(JSON.stringify(q,null,2));
        var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);

        var result = generateMySQLtext(abstractQueryTable);
        console.log(result["MySQLQuery"]);

        Session.set('generatedMySQL', result["MySQLQuery"]);
        setTextInMySQLEditor(result["MySQLQuery"])
        // Interpreter.destroyErrorMsg();
    })
}

function setTextInMySQLEditor(text) {
    MySQLEditor.setValue(text);
}

// generate MySQL query text
// abstractQueryTable - abstract query sintex table
function generateMySQLtext(abstractQueryTable) {
    const messages = [];
    const blocking = false;
    const rootClass = abstractQueryTable['root'];
    const generateIdsResult = generateIds(rootClass);
    const referenceTable = generateIdsResult['referenceTable'];

    // Starting query, each block separated by new line...
    const query = squel.select({ separator: "\n" });

    // Distinct
    if (rootClass.distinct) {
        query.distinct();
    }

    // From
    if (rootClass.identification) {
        query.from(rootClass.identification.localName);
    }

    // Aggregations
    if (rootClass.aggregations) {
        rootClass.aggregations.forEach(aggregation => {
            query.field(aggregation.exp, aggregation.alias);
        });
    }

    // Fields
    if (rootClass.fields) {
        rootClass.fields.forEach(field => {
            if (field.exp.includes('GROUP_CONCAT')) {
                query.group(field.exp);
            } else {
                query.field(field.exp, field.alias);
            }
        });
    }

    // Joins
    const joinInfo = generateMySQLJoins(query, rootClass, referenceTable);
    // messages = messages.concat(whereInfo["messages"]);

    // Where
    if (rootClass.conditions) {
        rootClass.conditions.forEach(condition => {
            query.where(condition.exp);
        });
    }

    // Order by
    if (rootClass.orderings) {
        rootClass.orderings.forEach(order => {
            query.order(order.exp, !order.isDescending);
        });
    }

    // Limit
    if (rootClass.limit != null) {
        if (!isNaN(rootClass.limit)) {
            query.limit(rootClass.limit);
        } else {
            messages.push({
                type: 'Warning',
                message: 'LIMIT should contain only numeric values',
                listOfElementId: [rootClass['identification']['_id']],
                isBlocking: false
            });
        }
    }

    // Offset
    if (rootClass.offset != null) {
        if (!isNaN(rootClass.offset)) {
            query.offset(rootClass.offset);
        } else {
            messages.push({
                type: 'Warning',
                message: 'OFFSET should contain only numeric values',
                listOfElementId: [rootClass['identification']['_id']],
                isBlocking: false
            });
        }
    }

    if (messages.length > 0) {
        let showMessages = '';
        for (const message in messages) {
            if (typeof messages[message] === 'object') {
                if (messages[message]['isBlocking']) {
                    blocking = true;
                }
                showMessages = showMessages + "\n\n" + messages[message]['message'];
            }
        }
        Interpreter.showErrorMsg(showMessages, -3);
    }

    const MySQLQuery = query.toString();
    console.log(abstractQueryTable);
    return { MySQLQuery, messages, blocking };
}

function generateMySQLJoins(query, data, referenceTable) {
    if (data.children) {
        data.children.forEach(child => {
            if (child.linkType === 'FULL') {
                query.outer_join(child.identification.localName);
            } else if (child.linkType === 'LEFT') {
                query.left_join(child.identification.localName);
            } else if (child.linkType === 'LEFT') {
                query.right_join(child.identification.localName);
            } else {
                query.join(child.identification.localName);
            }
        });
    }
    console.log(data, referenceTable);
}
