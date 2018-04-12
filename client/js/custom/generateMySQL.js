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
            Interpreter.showErrorMsg("More than one query found.", -3);
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

    ExecuteSPARQL_from_selection: function () {
        var editor = Interpreter.editor;
        var elem_ids = _.keys(editor.getSelectedElements());

        var queries = genAbstractQueryForElementList(elem_ids);
        // ErrorHandling - just one query at a moment allowed
        if (queries.length == 0) {
            Interpreter.showErrorMsg("No queries found.", -3);
            return;
        } else if (queries.length > 1) {
            Interpreter.showErrorMsg("More than one query found.", -3);
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
                Interpreter.showErrorMsg("More than one query found.", -3);
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

    ExecuteSPARQL_from_text: function (text, paging_info) {
        executeSparqlString(text, paging_info);
    },

    test_auto_completion: function () {
        var str = "2+3*div";
        var completions = [];
        try {
            var parsed_exp = vq_arithmetic.parse(str, { completions });
            console.log("parsed_exp", parsed_exp);
        } catch (e) {
            // TODO: error handling
            console.log(e)
        }
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
        Interpreter.showErrorMsg("More than one query found.", -3);
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

// string, {limit: , offset:, total_rows:} -->
// Executes the given Sparql end shows result in the GUI
function executeSparqlString(sparql, paging_info) {
    // Default Data Set Name (Graph IRI) and SPARQL endpoint url
    var graph_iri = "MiniBkusEN";
    var endpoint = "http://185.23.162.167:8833/sparql";

    var proj = Projects.findOne({ _id: Session.get("activeProject") });

    if (proj && proj.uri && proj.endpoint) {
        graph_iri = proj.uri;
        endpoint = proj.endpoint;
    } else {
        Interpreter.showErrorMsg("Project endpoint not properly configured", -3);
        return;
    };

    var list = {
        projectId: Session.get("activeProject"),
        versionId: Session.get("versionId"),
        options: {
            params: {
                params: {
                    "default-graph-uri": graph_iri,
                    query: sparql,
                },
            },
            endPoint: endpoint,
            paging_info: paging_info
        },
    };
    //console.log(list);
    Utilities.callMeteorMethod("executeSparql", list, function (res) {
        if (res.status == 200) {
            //console.log(res.result);
            Session.set("executedSparql", res.result);
            Interpreter.destroyErrorMsg();
            $('#vq-tab a[href="#executed"]').tab('show');
        } else {
            Session.set("executedSparql", { limit_set: false, number_of_rows: 0 });
            //console.error(res);
            if (res.status == 503) {
                Interpreter.showErrorMsg("SPARQL execution failed: most probably the endpoint is not reachable.", -3)
            } else if (res.status == 504) {
                Interpreter.showErrorMsg("SPARQL execution results unreadable.", -3)
            } else {
                var msg = ".";
                if (res.error && res.error.response) {
                    msg = ": " + res.error.response.content;
                };
                Interpreter.showErrorMsg("SPARQL execution failed" + msg, -3);
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
    yasqe.setValue(text);
    yasqe3.setValue(text);
}

// generate table with unique class names in form [_id] = class_unique_name
// clazz - abstract syntax table starting with given class object
// idTable - table with unique class names, generated so far
// counter - counter for classes with equals names
// parentClassId - parent class identificator
function generateClassIds(clazz, idTable, counter, parentClassId) {
    var referenceTable = [];

    // if instance if defined, use it
    if (clazz["instanceAlias"] != null && clazz["instanceAlias"].replace(" ", "") != "") idTable[clazz["identification"]["_id"]] = clazz["instanceAlias"].replace(/ /g, '_');
    else if (clazz["isVariable"] == true) idTable[clazz["identification"]["_id"]] = "_" + clazz["variableName"];
    else if ((clazz["instanceAlias"] == null || clazz["instanceAlias"].replace(" ", "") == "") && (clazz["identification"]["localName"] == null || clazz["identification"]["localName"] == "" || clazz["identification"]["localName"] == "(no_class)") || typeof clazz["identification"]["URI"] === 'undefined') {
        idTable[clazz["identification"]["_id"]] = "expr_" + counter;
        counter++;
    } else if (clazz["linkIdentification"]["localName"] == "==" && typeof idTable[parentClassId] !== 'undefined') {
        idTable[clazz["identification"]["_id"]] = idTable[parentClassId];
    }
    else {
        //TODO container name
        var foundInIdTable = false;
        for (var key in idTable) {
            // if given class name is in the table, add counter to the class name
            if (idTable[key] == clazz["identification"]["localName"]) {
                foundInIdTable = true;
                idTable[clazz["identification"]["_id"]] = clazz["identification"]["localName"] + "_" + counter;
                counter++;
            }
        }
        // if given class name is not in the table, use it
        if (foundInIdTable == false) idTable[clazz["identification"]["_id"]] = clazz["identification"]["localName"];
    }
    var className = idTable[clazz["identification"]["_id"]];
    var linkType = "palin";
    if (clazz["linkType"] != "REQUIRED" || clazz["isSubQuery"] == true || clazz["isGlobalSubQuery"] == true) linkType = "notPlain";

    referenceTable[className] = [];
    referenceTable[className]["type"] = linkType;

    if (clazz["linkType"] == "OPTIONAL" && clazz["isSubQuery"] != true && clazz["isGlobalSubQuery"] != true) referenceTable[className]["optionaPlain"] = true;
    else referenceTable[className]["optionaPlain"] = false;

    referenceTable[className]["classes"] = [];
    _.each(clazz["children"], function (subclazz) {
        var temp = generateClassIds(subclazz, idTable, counter, clazz["identification"]["_id"]);
        idTable.concat(temp["idTable"]);
        referenceTable[className]["classes"].push(temp["referenceTable"]);
    })
    return { idTable: idTable, referenceTable: referenceTable };
}


// generate MySQL query text
// abstractQueryTable - abstract query sintex table
function generateMySQLtext(abstractQueryTable) {
    const messages = [];
    const blocking = false;
    const rootClass = abstractQueryTable['root'];
    const generateIdsResult = generateIds(rootClass);
    const referenceTable = generateIdsResult['referenceTable'];

    // Starting query...
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
            query.field(field.exp, field.alias);
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
            if (child.linkType === 'OPTIONAL') {
                query.left_join(child.identification.localName);
            } else if (child.isSubQuery) {
                query.join(child.identification.localName);
            }
        });
    }
    console.log(data, referenceTable);
}

// genrerate SPARQL WHERE info
// sparqlTable - table with sparql parts
function generateMySQLWHEREInfo(sparqlTable, ws, fil, lin, referenceTable) {

    var whereInfo = [];
    var filters = [];
    var links = [];
    var bind = [];
    var messages = [];

    // whereInfo.push(sparqlTable["classTriple"]);

    // simpleTriples
    for (var expression in sparqlTable["simpleTriples"]) {
        var generateTimeFunctionForVirtuoso = true;
        if (generateTimeFunctionForVirtuoso == true && sparqlTable["simpleTriples"][expression]["isTimeFunction"] == true) {
            var timeExpression = [];
            if (typeof sparqlTable["simpleTriples"][expression] === 'object') {
                for (var triple in sparqlTable["simpleTriples"][expression]["triple"]) {
                    if (typeof sparqlTable["simpleTriples"][expression]["triple"][triple] === 'string') {
                        if (sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('BIND(') || sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('VALUES ?')) timeExpression.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
                        else if (sparqlTable["simpleTriples"][expression]["requireValues"] == true) timeExpression.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
                        else timeExpression.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
                    }
                }
            }
            if (typeof sparqlTable["simpleTriples"][expression]["bind"] === 'string') timeExpression.push(sparqlTable["simpleTriples"][expression]["bind"]);
            if (typeof sparqlTable["simpleTriples"][expression]["bound"] === 'string') timeExpression.push(sparqlTable["simpleTriples"][expression]["bound"]);
            whereInfo.push("OPTIONAL{" + sparqlTable["classTriple"] + "\n" + timeExpression.join("\n") + "}");
        }
        else {
            if (typeof sparqlTable["simpleTriples"][expression] === 'object') {
                for (var triple in sparqlTable["simpleTriples"][expression]["triple"]) {
                    if (typeof sparqlTable["simpleTriples"][expression]["triple"][triple] === 'string') {
                        if (sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('BIND(') || sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('VALUES ?')) whereInfo.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
                        else if (sparqlTable["simpleTriples"][expression]["requireValues"] == true) whereInfo.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
                        else whereInfo.push("OPTIONAL{" + sparqlTable["simpleTriples"][expression]["triple"][triple] + "}");
                    }
                }
            }
            if (typeof sparqlTable["simpleTriples"][expression]["bind"] === 'string') bind.push(sparqlTable["simpleTriples"][expression]["bind"]);
            if (typeof sparqlTable["simpleTriples"][expression]["bound"] === 'string') bind.push(sparqlTable["simpleTriples"][expression]["bound"]);
        }
        //if(typeof sparqlTable["simpleTriples"][expression]["bound"]  === 'string') whereInfo.push(sparqlTable["simpleTriples"][expression]["bound"]);

    }
    // expressionTriples
    /*for (var expression in sparqlTable["expressionTriples"]){
        if(typeof sparqlTable["expressionTriples"][expression] === 'object'){
            for (var triple in sparqlTable["expressionTriples"][expression]["triple"]){
                if(typeof sparqlTable["expressionTriples"][expression]["triple"][triple] === 'string') whereInfo.push("OPTIONAL{" + sparqlTable["expressionTriples"][expression]["triple"][triple] + "}");
            }
        }
        if(typeof sparqlTable["expressionTriples"][expression]["bind"]  === 'string') whereInfo.push(sparqlTable["expressionTriples"][expression]["bind"]);
        if(typeof sparqlTable["expressionTriples"][expression]["bound"]  === 'string') whereInfo.push(sparqlTable["expressionTriples"][expression]["bound"]);
    }

    // functionTriples
    for (var expression in sparqlTable["functionTriples"]){
        if(typeof sparqlTable["functionTriples"][expression] === 'object'){
            for (var triple in sparqlTable["functionTriples"][expression]["triple"]){
                if(typeof sparqlTable["functionTriples"][expression]["triple"][triple] === 'string') whereInfo.push("OPTIONAL{" + sparqlTable["functionTriples"][expression]["triple"][triple] + "}");
            }
        }
        if(typeof sparqlTable["functionTriples"][expression]["bind"]  === 'string') whereInfo.push(sparqlTable["functionTriples"][expression]["bind"]);
        if(typeof sparqlTable["functionTriples"][expression]["bound"]  === 'string') whereInfo.push(sparqlTable["functionTriples"][expression]["bound"]);
    }*/

    // aggregateTriples
    for (var expression in sparqlTable["aggregateTriples"]) {
        if (typeof sparqlTable["aggregateTriples"][expression] === 'object') {
            for (var triple in sparqlTable["aggregateTriples"][expression]["triple"]) {
                if (typeof sparqlTable["aggregateTriples"][expression]["triple"][triple] === 'string') whereInfo.push("OPTIONAL{" + sparqlTable["aggregateTriples"][expression]["triple"][triple] + "}");
            }
        }
        // if(typeof sparqlTable["aggregateTriples"][expression]["bind"]  === 'string') whereInfo.push(sparqlTable["aggregateTriples"][expression]["bind"]);
        // if(typeof sparqlTable["aggregateTriples"][expression]["bound"]  === 'string') whereInfo.push(sparqlTable["aggregateTriples"][expression]["bound"]);
    }

    // localAggregateSubQueries
    for (var expression in sparqlTable["localAggregateSubQueries"]) {
        if (typeof sparqlTable["localAggregateSubQueries"][expression] === 'string') {
            whereInfo.push(sparqlTable["localAggregateSubQueries"][expression]);
        }
    }

    // filterTriples
    for (var expression in sparqlTable["filterTriples"]) {
        if (typeof sparqlTable["filterTriples"][expression] === 'object') {
            for (var triple in sparqlTable["filterTriples"][expression]["triple"]) {
                //if(typeof sparqlTable["filterTriples"][expression]["triple"][triple] === 'string') whereInfo.push("OPTIONAL{" + sparqlTable["filterTriples"][expression]["triple"][triple] + "}");
                if (typeof sparqlTable["filterTriples"][expression]["triple"][triple] === 'string') whereInfo.push(sparqlTable["filterTriples"][expression]["triple"][triple]);
            }
        }
        if (typeof sparqlTable["filterTriples"][expression]["bind"] === 'string') bind.push(sparqlTable["filterTriples"][expression]["bind"]);
        if (typeof sparqlTable["filterTriples"][expression]["bound"] === 'string') bind.push(sparqlTable["filterTriples"][expression]["bound"]);
        //if(typeof sparqlTable["filterTriples"][expression]["bound"]  === 'string') whereInfo.push(sparqlTable["filterTriples"][expression]["bound"]);
    }

    whereInfo = whereInfo.concat(bind);

    //filters
    for (var expression in sparqlTable["filters"]) {
        if (typeof sparqlTable["filters"][expression] === 'string') {
            filters.push(sparqlTable["filters"][expression]);
        }
    }

    //link
    if (typeof sparqlTable["linkTriple"] === 'string') {
        links.push(sparqlTable["linkTriple"]);
    }

    //conditionLinks
    for (var expression in sparqlTable["conditionLinks"]) {
        if (typeof sparqlTable["conditionLinks"][expression] === 'string') {
            links.push(sparqlTable["conditionLinks"][expression]);
        }
    }

    if (sparqlTable["fullSPARQL"] != null) {
        if (sparqlTable["fullSPARQL"].toLowerCase().startsWith("select ") == true) whereInfo.unshift("{" + sparqlTable["fullSPARQL"] + "}");
    }

    if (typeof sparqlTable["subClasses"] !== 'undefined') {
        for (var subclass in sparqlTable["subClasses"]) {
            if (typeof sparqlTable["subClasses"][subclass] === 'object') {
                if (sparqlTable["subClasses"][subclass]["isUnion"] == true) {
                    var unionResult = getUNIONClasses(sparqlTable["subClasses"][subclass], sparqlTable["class"], sparqlTable["classTriple"], false, referenceTable)
                    whereInfo.push(unionResult["result"]);
                    messages = messages.concat(unionResult["messages"]);
                }
                else if (sparqlTable["subClasses"][subclass]["isSubQuery"] != true && sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true) {
                    var temp = generateMySQLWHEREInfo(sparqlTable["subClasses"][subclass], whereInfo, filters, links, referenceTable);
                    filters = filters.concat(temp["filters"]);
                    links = links.concat(temp["links"]);
                    whereInfo = whereInfo.concat(temp["triples"]);
                    messages = messages.concat(temp["messages"]);
                } else {
                    //sub selects
                    var selectResult = generateSELECT(sparqlTable["subClasses"][subclass]);

                    //reference candidates
                    var refTable = [];
                    for (var ref in selectResult["variableReferenceCandidate"]) {
                        if (typeof selectResult["variableReferenceCandidate"][ref] === 'string') {
                            if (checkIfReference(selectResult["variableReferenceCandidate"][ref], referenceTable, sparqlTable["subClasses"][subclass]["class"], true) == true) refTable.push("?" + selectResult["variableReferenceCandidate"][ref]);
                        }
                    }

                    var wheresubInfo = generateMySQLWHEREInfo(sparqlTable["subClasses"][subclass], [], [], [], referenceTable);

                    var temp = wheresubInfo["triples"];
                    temp = temp.concat(wheresubInfo["links"]);
                    temp = temp.concat(wheresubInfo["filters"]);
                    messages = messages.concat(wheresubInfo["messages"]);

                    var tempSelect = refTable;
                    tempSelect = tempSelect.concat(selectResult["select"]);
                    tempSelect = tempSelect.concat(selectResult["aggregate"]);

                    if (sparqlTable["subClasses"][subclass]["linkType"] != "NOT") {
                        var tempTable = selectResult["select"];
                        tempTable = tempTable.concat(selectResult["aggregate"]);
                        if (tempTable.length > 0 || sparqlTable["subClasses"][subclass]["equalityLink"] == true) {

                            var subQuery = "{SELECT ";

                            //DISTINCT
                            if (sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true) subQuery = subQuery + "DISTINCT ";

                            var parentClass = "";
                            if (sparqlTable["subClasses"][subclass]["linkTriple"] != null || sparqlTable["subClasses"][subclass]["equalityLink"] == true) {
                                parentClass = sparqlTable["class"] //+ " ";

                                selectResult["groupBy"].unshift(sparqlTable["class"]);
                            }
                            if (sparqlTable["isUnion"] == true || sparqlTable["isUnit"] == true) parentClass = "";
                            else tempSelect.unshift(parentClass);

                            tempSelect = tempSelect.filter(function (el, i, arr) {
                                return arr.indexOf(el) === i;
                            });

                            // subQuery = subQuery + parentClass + tempSelect.join(" ") + " WHERE{\n";
                            subQuery = subQuery + tempSelect.join(" ") + " WHERE{\n";

                            //SELECT DISTINCT
                            if (sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + "SELECT DISTINCT " + selectResult["innerDistinct"].join(" ") + " WHERE{\n";

                            if (sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL") {
                                // temp.push(sparqlTable["subClasses"][subclass]["classTriple"]);
                                temp.unshift(sparqlTable["classTriple"]);
                            }

                            var orderBy = sparqlTable["subClasses"][subclass]["order"];
                            //ad tripoles from order by
                            temp = temp.concat(orderBy["triples"])

                            var temp = temp.filter(function (el, i, arr) {
                                return arr.indexOf(el) === i;
                            });
                            subQuery = subQuery + temp.join("\n") + "}";


                            selectResult["groupBy"] = selectResult["groupBy"].concat(refTable);

                            selectResult["groupBy"] = selectResult["groupBy"].filter(function (el, i, arr) {
                                return arr.indexOf(el) === i;
                            });

                            var groupBy = selectResult["groupBy"].join(" ");
                            if (groupBy != "") groupBy = "\nGROUP BY " + groupBy;

                            if (sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + "}";

                            if (sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + groupBy;


                            //ORDER BY
                            if (orderBy["orders"] != "") subQuery = subQuery + "\nORDER BY " + orderBy["orders"];

                            //OFFSET
                            if (sparqlTable["subClasses"][subclass]["offset"] != null) {
                                if (!isNaN(sparqlTable["subClasses"][subclass]["offset"])) subQuery = subQuery + "\nOFFSET " + sparqlTable["subClasses"][subclass]["offset"];
                                else {
                                    //Interpreter.showErrorMsg("OFFSET should contain only numeric values");
                                    messages.push({
                                        "type": "Warning",
                                        "message": "OFFSET should contain only numeric values",
                                        "listOfElementId": [sparqlTable["subClasses"][subclass]["identification"]["_id"]],
                                        "isBlocking": false
                                    });
                                }
                            }
                            //LIMIT
                            if (sparqlTable["subClasses"][subclass]["limit"] != null) {
                                if (!isNaN(sparqlTable["subClasses"][subclass]["limit"])) subQuery = subQuery + "\nLIMIT " + sparqlTable["subClasses"][subclass]["limit"];
                                else {
                                    //Interpreter.showErrorMsg("LIMIT should contain only numeric values");
                                    messages.push({
                                        "type": "Warning",
                                        "message": "LIMIT should contain only numeric values",
                                        "listOfElementId": [sparqlTable["subClasses"][subclass]["identification"]["_id"]],
                                        "isBlocking": false
                                    });
                                }
                            }
                            subQuery = subQuery + "}";

                            whereInfo.unshift(subQuery);
                        } else {
                            var subQuery = "FILTER(EXISTS{" + temp.join("\n") + "})"
                            whereInfo.unshift(subQuery);
                        }

                    } else {
                        whereInfo.push("MINUS{" + temp.join("\n") + "}");
                    }
                }
            }
        }
    }

    if (typeof sparqlTable["classTriple"] !== 'undefined') whereInfo.unshift(sparqlTable["classTriple"]);

    // remove duplicates
    var whereInfo = whereInfo.filter(function (el, i, arr) {
        return arr.indexOf(el) === i;
    });

    var filters = filters.filter(function (el, i, arr) {
        return arr.indexOf(el) === i;
    });

    var links = links.filter(function (el, i, arr) {
        return arr.indexOf(el) === i;
    });

    if (sparqlTable["fullSPARQL"] != null) {
        if (sparqlTable["fullSPARQL"].toLowerCase().startsWith("select ") != true) whereInfo.push(sparqlTable["fullSPARQL"]);
    }

    //link type
    if (typeof sparqlTable["linkType"] === 'string' && sparqlTable["linkType"] == "OPTIONAL") {
        whereInfo = whereInfo.concat(filters);
        whereInfo = whereInfo.concat(links);
        if (sparqlTable["isSimpleClassName"] == true) {
            var tempString = "OPTIONAL{" + whereInfo.join("\n") + "}";
            whereInfo = [];
            whereInfo.push(tempString);
        } else { console.log("OPTIONAL subselect replaced with required") }
        filters = [];
        links = [];
    }
    if (typeof sparqlTable["linkType"] === 'string' && sparqlTable["linkType"] == "NOT") {
        whereInfo = whereInfo.concat(filters);
        whereInfo = whereInfo.concat(links);
        var tempString = "FILTER NOT EXISTS{" + whereInfo.join("\n") + "}";
        whereInfo = [];
        whereInfo.push(tempString);
        filters = [];
        links = [];
    }
    whereInfo.concat(ws);
    filters.concat(fil);
    links.concat(lin);

    return { "triples": whereInfo, "filters": filters, "links": links, "messages": messages }
}

function checkIfReference(reference, referenceTable, subQueryMainClass, isPlain) {

    for (var ref in referenceTable) {
        if (typeof referenceTable[ref] === 'object') {
            if (typeof referenceTable[ref]["type"] !== 'undefined' && referenceTable[ref]["type"] == "notPlain") isPlain = false;
            if (reference == ref) {
                if (isPlain == true) return true;
                else {
                    if (findSubQueryMainClass(referenceTable[ref]["classes"], subQueryMainClass) == true) return true;
                }
            } else {
                var result = false;
                for (var r in referenceTable[ref]["classes"]) {
                    if (typeof referenceTable[ref]["classes"][r] === 'object') {
                        var tempResult = checkIfReference(reference, referenceTable[ref]["classes"][r], subQueryMainClass, isPlain);
                        if (tempResult == true) result = true;
                    }
                }
                if (result == true) return true;
            }
        }
    }
    return false;
}

function findSubQueryMainClass(referenceTable, subQueryMainClass) {
    var result = false;
    for (var ref in referenceTable) {
        if (typeof referenceTable[ref] === 'object') {
            for (var r in referenceTable[ref]) {
                if (typeof referenceTable[ref][r] === 'object') {
                    if ("?" + r == subQueryMainClass) result = true;
                    else {
                        var temp = findSubQueryMainClass(referenceTable[ref][r]["classes"], subQueryMainClass);
                        if (temp == true) result = true;
                    }
                }
            }
        }
    }
    return result;
}

function getUNIONClasses(sparqlTable, parentClassInstance, parentClassTriple, generateUpperSelect, referenceTable) {
    var whereInfo = [];
    var unionsubSELECTstaterents = [];
    var messages = [];

    if (typeof sparqlTable["subClasses"] !== 'undefined') {
        for (var subclass in sparqlTable["subClasses"]) {
            if (typeof sparqlTable["subClasses"][subclass] === 'object') {
                var selectResult = generateSELECT(sparqlTable["subClasses"][subclass]);

                var wheresubInfo = generateMySQLWHEREInfo(sparqlTable["subClasses"][subclass], [], [], [], referenceTable);
                var temp = wheresubInfo["triples"];
                temp = temp.concat(wheresubInfo["links"]);
                temp = temp.concat(wheresubInfo["filters"]);
                messages = messages.concat(wheresubInfo["messages"]);

                var tempSelect = selectResult["select"];
                tempSelect = tempSelect.concat(selectResult["aggregate"]);


                if (sparqlTable["subClasses"][subclass]["isSubQuery"] != true && sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true) {
                    var subQuery = "{";

                    //union parent triple
                    if (parentClassTriple != null) subQuery = subQuery + parentClassTriple + "\n";

                    //triples
                    subQuery = subQuery + temp.join("\n");

                    subQuery = subQuery + "}";

                    whereInfo.push(subQuery);

                    unionsubSELECTstaterents = unionsubSELECTstaterents.concat(tempSelect);
                } else {
                    if (sparqlTable["subClasses"][subclass]["linkType"] != "NOT") {
                        var subQuery = "{SELECT ";

                        //DISTINCT
                        if (sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true) subQuery = subQuery + "DISTINCT ";

                        if (parentClassInstance != null) {
                            subQuery = subQuery + parentClassInstance + " ";
                        }
                        subQuery = subQuery + tempSelect.join(" ") + " WHERE{\n";

                        //SELECT DISTINCT
                        if (sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + "SELECT DISTINCT " + selectResult["innerDistinct"].join(" ") + " WHERE{\n";

                        //union parent triple
                        if (parentClassTriple != null) subQuery = subQuery + parentClassTriple + "\n";

                        var orderBy = sparqlTable["subClasses"][subclass]["order"];
                        //add triples from order by
                        temp = temp.concat(orderBy["triples"]);

                        subQuery = subQuery + temp.join("\n") + "}";

                        var groupBy = selectResult["groupBy"].join(" ");
                        if (groupBy != "") groupBy = "\nGROUP BY " + groupBy;

                        if (sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + "}";

                        if (sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + groupBy;

                        //ORDER BY

                        if (orderBy["orders"] != "") subQuery = subQuery + "\nORDER BY " + orderBy["orders"];

                        //OFFSET
                        if (sparqlTable["subClasses"][subclass]["offset"] != null) {
                            if (!isNaN(sparqlTable["subClasses"][subclass]["offset"])) subQuery = subQuery + "\nOFFSET " + sparqlTable["subClasses"][subclass]["offset"];
                            else {
                                //Interpreter.showErrorMsg("OFFSET should contain only numeric values");
                                messages.push({
                                    "type": "Warning",
                                    "message": "OFFSET should contain only numeric values",
                                    "listOfElementId": [sparqlTable["subClasses"][subclass]["identification"]["_id"]],
                                    "isBlocking": false
                                });
                            }
                        }
                        //LIMIT
                        if (sparqlTable["subClasses"][subclass]["limit"] != null) {
                            if (!isNaN(sparqlTable["subClasses"][subclass]["limit"])) subQuery = subQuery + "\nLIMIT " + sparqlTable["subClasses"][subclass]["limit"];
                            else {
                                //Interpreter.showErrorMsg("LIMIT should contain only numeric values");
                                messages.push({
                                    "type": "Warning",
                                    "message": "LIMIT should contain only numeric values",
                                    "listOfElementId": [sparqlTable["subClasses"][subclass]["identification"]["_id"]],
                                    "isBlocking": false
                                });
                            }
                        }
                        subQuery = subQuery + "}";

                        whereInfo.push(subQuery);
                    } else {
                        whereInfo.push("MINUS{" + temp.join("\n") + "}");
                    }
                }
            }
        }
    }

    unionsubSELECTstaterents = unionsubSELECTstaterents.filter(function (el, i, arr) {
        return arr.indexOf(el) === i;
    });

    var returnValue = whereInfo.join("\nUNION\n");
    if (generateUpperSelect == true) returnValue = "SELECT " + unionsubSELECTstaterents.join(" ") + " WHERE{\n" + returnValue + "}";
    else if (sparqlTable["isSubQuery"] == true || sparqlTable["isGlobalSubQuery"] == true) {
        if (unionsubSELECTstaterents.length > 0) {
            returnValue = "{SELECT " + unionsubSELECTstaterents.join(" ") + " WHERE{\n" + returnValue + "}}";
            if (sparqlTable["linkType"] == "OPTIONAL") returnValue = "OPTIONAL" + returnValue;
        }
        else if (sparqlTable["linkType"] == "NOT") returnValue = "MINUS{FILTER NOT EXISTS{" + returnValue + "}}";
        else returnValue = "FILTER(EXISTS{" + returnValue + "})";
    }
    return { "result": returnValue, "messages": messages };
}

function generateSELECT(sparqlTable) {
    selectInfo = [];
    variableReferenceInfo = [];
    aggregateSelectInfo = [];
    innerDistinctInfo = [];
    variableReferenceCandidate = [];
    // selectClasses = [];
    groupBy = [];

    // selectMAIN

    // simpleVariables
    for (var number in sparqlTable["selectMain"]["simpleVariables"]) {
        if (typeof sparqlTable["selectMain"]["simpleVariables"][number]["alias"] === 'string') {
            selectInfo.push(sparqlTable["selectMain"]["simpleVariables"][number]["alias"]);
            groupBy.push(sparqlTable["selectMain"]["simpleVariables"][number]["alias"]);
        }
    }
    for (var number in sparqlTable["innerDistinct"]["simpleVariables"]) {
        if (typeof sparqlTable["innerDistinct"]["simpleVariables"][number] === 'string') {
            innerDistinctInfo.push(sparqlTable["innerDistinct"]["simpleVariables"][number]);
        }
    }

    // expressionVariables
    /*for (var number in sparqlTable["selectMain"]["expressionVariables"]){
        if(typeof sparqlTable["selectMain"]["expressionVariables"][number]["alias"] === 'string') {
            selectInfo.push(sparqlTable["selectMain"]["expressionVariables"][number]["alias"]);
            groupBy.push(sparqlTable["selectMain"]["expressionVariables"][number]["alias"]);
        }
    }
    for (var number in sparqlTable["innerDistinct"]["expressionVariables"]){
        if(typeof sparqlTable["innerDistinct"]["expressionVariables"][number] === 'string') {
            innerDistinctInfo.push(sparqlTable["innerDistinct"]["expressionVariables"][number]);
        }
    }*/

    // functionVariables
    /*for (var number in sparqlTable["selectMain"]["functionVariables"]){
        if(typeof sparqlTable["selectMain"]["functionVariables"][number]["alias"] === 'string') {
            selectInfo.push(sparqlTable["selectMain"]["functionVariables"][number]["alias"]);
            groupBy.push(sparqlTable["selectMain"]["functionVariables"][number]["alias"]);
        }
    }
    for (var number in sparqlTable["innerDistinct"]["functionVariables"]){
        if(typeof sparqlTable["innerDistinct"]["functionVariables"][number] === 'string') {
            innerDistinctInfo.push(sparqlTable["innerDistinct"]["functionVariables"][number]);
        }
    }*/

    //variable names
    if (typeof sparqlTable["variableName"] !== 'undefined') {
        selectInfo.push(sparqlTable["variableName"]);
        groupBy.push(sparqlTable["variableName"]);
        innerDistinctInfo.push(sparqlTable["variableName"]);
    }
    if (typeof sparqlTable["linkVariableName"] !== 'undefined') selectInfo.push(sparqlTable["linkVariableName"]);

    // aggregateVariables
    for (var number in sparqlTable["selectMain"]["aggregateVariables"]) {
        if (typeof sparqlTable["selectMain"]["aggregateVariables"][number]["alias"] === 'string') {
            aggregateSelectInfo.push(
                `${sparqlTable["selectMain"]["aggregateVariables"][number]["value"]} AS ${sparqlTable["selectMain"]["aggregateVariables"][number]["alias"]}`
            );
        }
    }
    for (var number in sparqlTable["innerDistinct"]["aggregateVariables"]) {
        if (typeof sparqlTable["innerDistinct"]["aggregateVariables"][number] === 'string') {
            innerDistinctInfo.push(sparqlTable["innerDistinct"]["aggregateVariables"][number]);
        }
    }

    //subQuery references
    for (var number in sparqlTable["selectMain"]["referenceVariables"]) {
        if (typeof sparqlTable["selectMain"]["referenceVariables"][number] === 'string') {
            variableReferenceInfo.push(sparqlTable["selectMain"]["referenceVariables"][number]);
        }
    }

    //referenceCandidates
    for (var number in sparqlTable["variableReferenceCandidate"]) {
        if (typeof sparqlTable["variableReferenceCandidate"][number] === 'string') {
            variableReferenceCandidate.push(sparqlTable["variableReferenceCandidate"][number]);
        }
    }

    // remove duplicates
    var groupBy = groupBy.filter(function (el, i, arr) {
        return arr.indexOf(el) === i;
    });
    var selectInfo = selectInfo.filter(function (el, i, arr) {
        return arr.indexOf(el) === i;
    });
    var aggregateSelectInfo = aggregateSelectInfo.filter(function (el, i, arr) {
        return arr.indexOf(el) === i;
    });
    var innerDistinctInfo = innerDistinctInfo.filter(function (el, i, arr) {
        return arr.indexOf(el) === i;
    });
    var variableReferenceInfo = variableReferenceInfo.filter(function (el, i, arr) {
        return arr.indexOf(el) === i;
    });
    var variableReferenceCandidate = variableReferenceCandidate.filter(function (el, i, arr) {
        return arr.indexOf(el) === i;
    });

    if (typeof sparqlTable["subClasses"] !== 'undefined') {
        for (var subclass in sparqlTable["subClasses"]) {
            if (typeof sparqlTable["subClasses"][subclass] === 'object' && sparqlTable["subClasses"][subclass]["isSubQuery"] != true && sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true) {
                var temp = generateSELECT(sparqlTable["subClasses"][subclass]);
                selectInfo = selectInfo.concat(temp["select"]);
                variableReferenceCandidate = variableReferenceCandidate.concat(temp["variableReferenceCandidate"]);
                variableReferenceInfo = variableReferenceInfo.concat(temp["variableReference"]);
                innerDistinctInfo = innerDistinctInfo.concat(temp["innerDistinct"]);
                aggregateSelectInfo = aggregateSelectInfo.concat(temp["aggregate"]);
                groupBy = groupBy.concat(temp["groupBy"]);
                // selectClasses = selectClasses.concat(temp["classes"]);
            }
        }
    }

    return { "select": selectInfo, "innerDistinct": innerDistinctInfo, "aggregate": aggregateSelectInfo, "groupBy": groupBy, "variableReference": variableReferenceInfo, "variableReferenceCandidate": variableReferenceCandidate };
}
