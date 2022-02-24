(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],{

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var sqlparser_rs_wasm__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! sqlparser-rs-wasm */ \"./node_modules/sqlparser-rs-wasm/sqlparser-rs-wasm.js\");\n\n\ndocument.getElementById('convert-button').addEventListener('click', function () {\n    let input = document.getElementById(\"input\").value;\n\n    if (input.trim() === '') {\n        return;\n    }\n\n    if (input.slice(-1) === ';') {\n        input = input.slice(0, -1);\n    }\n\n    let output_text_area = document.getElementById(\"output\");\n\n    if (!input.startsWith('select') && !input.startsWith('SELECT')) {\n        output_text_area.value = 'SQL must start with select or SELECT';\n\n        return;\n    }\n\n    try {\n        let ast = sqlparser_rs_wasm__WEBPACK_IMPORTED_MODULE_0__[\"parse_sql\"](\"--mysql\", input);\n\n        output_text_area.value = (new Convert(JSON.parse(ast)[0].Query)).run();\n    } catch (e) {\n        output_text_area.value = e;\n    }\n\n});\n\nclass Convert\n{\n    constructor(ast) {\n        this.ast = ast;\n        this.wheres = [];\n        this.joins = [];\n        this.table_name_by_alias = {};\n    }\n\n    run(need_append_get_suffix = true) {\n        let res = this.resolveMainTableSection() + '\\n';\n        let join_section = '';\n\n        // Resolve 'join' section before 'where' section, because need find joined table alias\n        if (this.hasJoinSection()) {\n            join_section =this.resolveJoinSection();\n        }\n\n        res = res + '->' + this.resolveSelectSection() + '\\n';\n\n        if (join_section !== '') {\n            res = res + '->' + join_section + '\\n';\n        }\n\n        if (this.hasWhereSection()) {\n            res = res + '->' + this.resolveWhereSection() + '\\n';\n        }\n\n        if (this.hasGroupBySection()) {\n            res = res + '->' + this.resolveGroupBySection() + '\\n';\n\n            if (this.hasHavingSection()) {\n                res = res + '->' + this.resolveHavingSection() + '\\n';\n            }\n        }\n\n        if (need_append_get_suffix) {\n            res = res + '->get();';\n        }\n\n        return res;\n    }\n\n    resolveTableNameFromRelationNode(relation_node) {\n        let table_name = relation_node.Table.name[0].value;\n\n        if (propertyExistsInObjectAndNotNull(relation_node.Table, 'alias')) {\n            this.table_name_by_alias[relation_node.Table.alias.name.value] = table_name;\n        }\n\n        return quote(table_name);\n    }\n\n    /**\n     * @return {string}\n     */\n    resolveMainTableSection() {\n        return 'DB::table(' + this.resolveTableNameFromRelationNode(this.ast.body.Select.from[0].relation) + ')';\n    }\n\n    /**\n     * @return {boolean}\n     */\n    hasWhereSection() {\n        return propertyExistsInObjectAndNotNull(this.ast.body.Select, 'selection');\n    }\n\n    resolveWhereSection() {\n        assert(this.ast.body.Select.selection !== null, 'selection section must exist');\n\n        let condition_type = getNestedUniqueKeyFromObject(this.ast.body.Select.selection);\n        let condition = getNestedUniqueValueFromObject(this.ast.body.Select.selection);\n\n        this.prepareWheres(condition_type, condition, '');\n\n        return this.wheres.join('\\n->');\n    }\n\n    /**\n     * @param {string} condition_type\n     * @param {Object} condition\n     * @param {Object} op one of ['', 'And', 'Or']\n     * @return {void}\n     */\n    prepareWheres(condition_type, condition, op) {\n        if (condition_type === 'IsNull' || condition_type === 'IsNotNull') {\n            let method_name = condition_type === 'IsNull' ? 'whereNull' : 'whereNotNull';\n            this.wheres.push(this.addPrefix2WhereMethods(op, method_name) + '(' + this.convertIdentifier2qualifiedColumn(condition.CompoundIdentifier) + ')');\n        } else if (condition_type === 'InList') {\n            let column = this.convertIdentifier2qualifiedColumn(getNestedUniqueValueFromObject(condition.expr));\n            let list = condition.list.map((i) => this.resolveValue(getNestedUniqueValueFromObject(i)));\n\n            let method_name = condition.negated ? 'whereNotIn' : 'whereIn';\n            this.wheres.push(this.addPrefix2WhereMethods(op, method_name) + '(' + column + ',' + '[' + list.join(', ') + '])');\n        } else if (condition_type === 'BinaryOp') {\n            if (condition.op === 'And' || condition.op === 'Or') {\n                let left_condition_type = getNestedUniqueKeyFromObject(condition.left);\n                let left_condition = getNestedUniqueValueFromObject(condition.left);\n                this.prepareWheres(left_condition_type, left_condition, op);\n\n                let right_condition_type = getNestedUniqueKeyFromObject(condition.right);\n                let right_condition = getNestedUniqueValueFromObject(condition.right);\n                this.prepareWheres(right_condition_type, right_condition, condition.op);\n            } else {\n                let left = this.convertIdentifier2qualifiedColumn(getNestedUniqueValueFromObject(condition.left));\n                let right = this.resolveValue(getNestedUniqueValueFromObject(condition.right))\n                this.wheres.push(this.addPrefix2WhereMethods(op, 'where') + '(' + left + ',' + this.transformBinaryOp(condition.op) + ',' + right + ')');\n            }\n        } else {\n            throw 'Logic error, unhandled condition type [' + condition_type + ']';\n        }\n    }\n\n    /**\n     * @param op\n     * @return {string}\n     */\n    transformBinaryOp(op) {\n        let operator_by_op = {\n            'Eq': '=',\n            'Gt': '>',\n            'GtEq': '>=',\n            'Lt': '<',\n            'LtEq': '<',\n            'NotEq': '!=',\n            'Like': 'like',\n        };\n\n        return operator_by_op[op];\n    }\n\n    addPrefix2WhereMethods(op, method_name) {\n        if (op === '') {\n            return method_name;\n        }\n\n        return op.toLowerCase() + capitalizeFirstLetter(method_name);\n    }\n\n    /**\n     * @return {string}\n     */\n    resolveSelectSection() {\n        let res = [];\n\n        for (const select_item of this.ast.body.Select.projection) {\n            if (propertyExistsInObjectAndNotNull(select_item, 'ExprWithAlias')) {\n                let alias = select_item.ExprWithAlias.alias.value;\n                res.push(this.resolveSelectSectionItem(select_item.ExprWithAlias.expr, alias));\n            } else if (propertyExistsInObjectAndNotNull(select_item, 'UnnamedExpr')) {\n                res.push(this.resolveSelectSectionItem(select_item.UnnamedExpr));\n            } else if (select_item === 'Wildcard') {\n                res.push('*');\n            } else {\n                throw 'Logic error, unhandled select item [' + Object.keys(select_item)[0] + ']';\n            }\n        }\n\n        return 'select(' + res.join(', ') + ')';\n    }\n\n    /**\n     * @param select_item\n     * @param alias\n     * @return {string}\n     */\n    resolveSelectSectionItem(select_item, alias = null) {\n        assert(isUndefinedOrNull(select_item) === false, 'select_item must not be undefined or null');\n\n        let item;\n        if (propertyExistsInObjectAndNotNull(select_item, 'Function')) {\n            item = 'DB::raw(\"' + this.parseFunctionNode(select_item.Function);\n\n            if (alias !== null) {\n                item = item + ' as ' + alias + '\")';\n            }\n\n            return item;\n        } else {\n            if (propertyExistsInObjectAndNotNull(select_item, 'CompoundIdentifier')) {\n                item = this.convertIdentifier2qualifiedColumn(select_item.CompoundIdentifier, false);\n            } else {\n                item = select_item.Identifier.value;\n            }\n\n            if (alias !== null) {\n                item = item + ' as ' + alias;\n            }\n\n            return quote(item);\n        }\n    }\n\n    parseFunctionNode(function_node) {\n        let function_name = function_node.name[0].value;\n        let res = function_name + '(';\n        let args = function_node.args;\n        let arg_count = args.length;\n\n        for (let i = 0; i < arg_count; i++) {\n            let arg = args[i];\n\n            if (arg.Unnamed === 'Wildcard') {\n                res = res + '*';\n            } else if (propertyExistsInObjectAndNotNull(arg.Unnamed.Expr, 'Value')) {\n                res = res + this.resolveValue(arg.Unnamed.Expr.Value);\n            } else if (propertyExistsInObjectAndNotNull(arg.Unnamed.Expr, 'Identifier')) {\n                res = res + arg.Unnamed.Expr.Identifier.value;\n            } else if (propertyExistsInObjectAndNotNull(arg.Unnamed.Expr, 'CompoundIdentifier')) {\n                res = res + this.convertIdentifier2qualifiedColumn(arg.Unnamed.Expr.CompoundIdentifier);\n            } else {\n                throw 'Logic error, unhandled arg type';\n            }\n\n\n            if (i !== arg_count - 1) {\n                res = res + ', ';\n            }\n        }\n\n        res = res + ')';\n\n        return res;\n    }\n\n    /**\n     * @return {boolean}\n     */\n    hasJoinSection() {\n        if (this.ast.body.Select.from.length > 1) {\n            throw 'Cross join is not supported';\n        }\n\n        return propertyExistsInObjectAndNotNull(this.ast.body.Select.from[0], 'joins') && this.ast.body.Select.from[0].joins.length > 0;\n    }\n\n    prepareJoins() {\n        for (const join of this.ast.body.Select.from[0].joins) {\n            let join_operator_type = getNestedUniqueKeyFromObject(join.join_operator);\n            let join_method = {\n                'Inner': 'join',\n                'LeftOuter': 'leftJoin',\n                'RightOuter': 'rightJoin',\n            }[join_operator_type];\n            let join_operator = getNestedUniqueValueFromObject(join.join_operator);\n            let binary_op = join_operator.On.BinaryOp;\n            let left = this.convertIdentifier2qualifiedColumn(getNestedUniqueValueFromObject(binary_op.left));\n            let on_condition = this.transformBinaryOp(binary_op.op);\n            let right = this.convertIdentifier2qualifiedColumn(getNestedUniqueValueFromObject(binary_op.right));\n\n            if (propertyExistsInObjectAndNotNull(join.relation, 'Derived')) { // joined section is sub-query\n                let sub_query_sql = new Convert(join.relation.Derived.subquery).run(false);\n                let sub_query_alias = join.relation.Derived.alias.name.value;\n                this.joins.push(join_method + '(DB::raw(\"' + addTabToEveryLine(sub_query_sql) + '\") as '\n                    + sub_query_alias + '), function($join) {\\n\\t'\n                    + '$join->on(' + left + ',' + on_condition + ',' + right + ');'\n                    + '\\n}');\n            } else {\n                let joined_table = this.resolveTableNameFromRelationNode(join.relation);\n                this.joins.push(join_method + '(' + joined_table + ',' + left + ',' + on_condition + ',' + right + ')');\n            }\n        }\n    }\n\n    resolveJoinSection() {\n        this.prepareJoins();\n\n        return this.joins.join('\\n->');\n    }\n\n    hasGroupBySection() {\n        return propertyExistsInObjectAndNotNull(this.ast.body.Select, 'group_by') && this.ast.body.Select.group_by.length > 0;\n    }\n\n    resolveGroupBySection() {\n        let group_by = this.ast.body.Select.group_by;\n\n        if (group_by.length === 1) {\n            return 'groupBy(' + this.convertIdentifier2qualifiedColumn(getNestedUniqueValueFromObject(group_by[0])) + ')';\n        } else {\n            return 'groupByRaw(' + quote(group_by.map((i) => this.convertIdentifier2qualifiedColumn(getNestedUniqueValueFromObject(i), false)).join(', ')) + ')';\n        }\n    }\n\n    hasHavingSection() {\n        return propertyExistsInObjectAndNotNull(this.ast.body.Select, 'having');\n    }\n\n    resolveHavingSection() {\n        let binary_op = getNestedUniqueValueFromObject(this.ast.body.Select.having, 'BinaryOp');\n        let right = this.resolveValue(getNestedUniqueValueFromObject(binary_op.right))\n        let left;\n        let method_name;\n\n        if (propertyExistsInObjectAndNotNull(binary_op.left, 'Function')) {\n            left = quote(this.parseFunctionNode(binary_op.left.Function));\n            method_name = 'havingRaw';\n        } else {\n            left = this.convertIdentifier2qualifiedColumn(getNestedUniqueValueFromObject(binary_op.left));\n            method_name = 'having';\n        }\n\n        return method_name + '(' + left + ', ' + quote(this.transformBinaryOp(binary_op.op)) + ',' + right + ')';\n    }\n\n    /**\n     * @param value\n     * @return {string|*}\n     */\n    resolveValue(value) {\n        if (propertyExistsInObjectAndNotNull(value, 'SingleQuotedString')) {\n            return quote(value.SingleQuotedString);\n        } else if (propertyExistsInObjectAndNotNull(value, 'Number')) {\n            return value.Number[0];\n        } else {\n            throw 'Logic error, unhandled arg value type [' + Object.keys(selection)[0] + ']';\n        }\n    }\n\n    /**\n     * @param identifier\n     * @param {boolean} need_quote\n     * @return {string}\n     */\n    convertIdentifier2qualifiedColumn(identifier, need_quote = true) {\n        let values = [identifier].flat().map((i) => i.value);\n        let table_name_or_alias = values[0];\n\n        // First index always is table name or alias, change it to actual table name.\n        if (propertyExistsInObjectAndNotNull(this.table_name_by_alias, table_name_or_alias)) {\n            values[0] = this.table_name_by_alias[table_name_or_alias];\n        }\n\n        let res = values.join('.');\n\n        if (need_quote) {\n            res = quote(res);\n        }\n\n        return res;\n    }\n}\n\n// region helper functions\n/**\n * @param {boolean} condition\n * @param {string} msg\n */\nfunction assert(condition, msg) {\n    if (!condition) {\n        throw msg;\n    }\n}\n\n/**\n * @param obj\n * @param property_name\n * @return {boolean}\n */\nfunction propertyExistsInObjectAndNotNull(obj, property_name) {\n    return obj.hasOwnProperty(property_name) && obj[property_name] !== null;\n}\n\n/**\n * @param value\n * @return {boolean}\n */\nfunction isString(value) {\n    return  typeof value === 'string' || value instanceof String;\n}\n\nfunction capitalizeFirstLetter(string) {\n    return string.charAt(0).toUpperCase() + string.slice(1);\n}\n\n/**\n * @param value\n * @return {string}\n */\nfunction quote(value) {\n    return \"'\" + value + \"'\";\n}\n\n/**\n * @param obj\n * @return {string}\n */\nfunction getNestedUniqueKeyFromObject(obj) {\n    if (Object.keys(obj).length !== 1) {\n        throw 'The function can only be called on object that has one key, object: ' + JSON.stringify(obj);\n    }\n\n    return Object.keys(obj)[0];\n}\n\n/**\n * @param obj\n * @return {*}\n */\nfunction getNestedUniqueValueFromObject(obj) {\n    return obj[getNestedUniqueKeyFromObject(obj)];\n}\n\n/**\n * @param value\n * @return {boolean}\n */\nfunction isUndefinedOrNull(value) {\n    return typeof value === 'undefined' || value === null;\n}\n\n/**\n * @param str\n * @param tab_count\n */\nfunction addTabToEveryLine(str, tab_count = 1) {\n    let separator = '\\n';\n\n    for (let i = 0; i < tab_count; i++) {\n        separator = separator + '\\t';\n    }\n\n    return str.split('\\n').join(separator);\n}\n\n\n// end region\n\n\n//# sourceURL=webpack:///./src/index.js?");

/***/ })

}]);