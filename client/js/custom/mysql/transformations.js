Interpreter.customMethods({
    VQgetMySQLAttributeNames() {
        const elementId = Session.get('activeElement');
        if (!elementId) {
            return [];
        }
        const actComp = Compartments.findOne({ elementId })
        if (!actComp) {
            return [];
        }

        const elemType = ElementTypes.findOne({ name: 'Class' });
        if (elemType && actComp['elementTypeId'] != elemType._id) {
            return [];
        }

        //Active element is given as Class type element
        let attributes = [];

        const actEl = Elements.findOne({ _id: elementId }); //Check if element ID is valid

        if (actEl) {
            //Read attribute values from DB

            //check if Class name is defined for active element
            const compartType = CompartmentTypes.findOne({ name: "Name", elementTypeId: actEl["elementTypeId"] });

            if (!compartType) {
                return attributes;
            }

            const compart = Compartments.findOne({ compartmentTypeId: compartType["_id"], elementId });
            if (!compart) {
                return attributes;
            }

            const schema = new VQ_Schema();
            const input = compart['input'];
            if (schema.Tables && schema.Tables[input] && schema.Tables[input].attributes) {
                attributes = schema.Tables[input].attributes.map(attr => ({ value: attr.name, input: attr.name }))
            }
        }

        attributes = _.sortBy(attributes, 'input');
        attributes.push({ input: '*', value: '*' });

        return attributes;
    },
});
