Ext.define( 'Rally.ui.tree.extendedTreeItem' , {
    alias: 'widget.extendedTreeItem',
    extend: 'Rally.ui.tree.TreeItem',
    config: {
        displayedFields: ['Name', 'Description', 'TeamMembers']
    },

    myColour: 'white',

    initComponent: function() {
        this.callParent(arguments);
        this.addCls(Rally.util.Test.toBrowserTestCssClass(this.getRecord().getId()));

        this.addEvents(
            /**
             * @event
             * @param record the record this item represents
             * Tree Item expanded
             */
            'expand',
            /**
             * @event
             * @param record the record this item represents
             * Tree Item collapsed
             */
            'collapse',
            /**
             * @event
             * @param treeItem this tree item
             * Tree Item drawn (every time it's drawn)
             */
            'draw',
            /**
             * @event
             * @param treeItem this tree item
             * Tree Item selected
             */
            'select',

            /**
             * These two will be used to propagate colours up and down the tree
             */
            'colourProject',
            'colourEditor',
            'colourViewer'
        );

        this.on('afterrender', function() {


            //Do in two steps to keep in sync
            if (this._getAutoExpanded()) {
                this.setExpanded(true);
            }

            this.draw();

            if (this._getAutoExpanded()) {
                this.fireEvent('expand', this);
            }
        }, this);

        this.on('colourProject', function() {
            this.colourMeProject();
            var bubbleUp = this.getBubbleTarget();
            bubbleUp.fireEvent('colourProject');
        }, this);

        this.on('colourEditor', function() {
            this.colourMeEditor();
            var bubbleUp = this.getBubbleTarget();
            bubbleUp.fireEvent('colourEditor');
        }, this);

        this.on('colourViewer', function() {
            this.colourMeViewer();
            var bubbleUp = this.getBubbleTarget();
            bubbleUp.fireEvent('colourViewer');
        }, this);

    },

    colourMeViewer: function() {
        debugger;
    },

    colourMeEditor: function() {
        debugger;
    },

    colourMeProject: function() {
        debugger;
    },

    getMyColour: function(me) {
        var app = this.up('#userApp');

        //Frist find overall workspace permission level
        var colour = app._getWorkspaceColour();

        //Now override that with any project specific permission
        if (!app._workspaceRights()) {
            projColour = app._getProjectColour(me.getRecord());
            if (projColour) {
              colour = projColour;
            }
        }
        return colour;
    },

    _getAutoExpanded: function() {
        var app = this.up('#userApp');

        return app.getSetting('autoExpand');
    },

    getContentTpl: function() {
        var me = this;

        return Ext.create('Ext.XTemplate',
            '<tpl if="this.canDrag()"><div class="icon drag"></div></tpl>',
            '{[this.getActionsGear()]}',
            '<div class="textContent ellipses" style="padding-left: 5px; border-left: 5px solid {[this.getMyColour()]}">{[this.getFormattedId()]} {[this.getSeparator()]}{Name} ({[this.getOwner()]})</div>',
            '<div class="rightSide">',
            '</div>',
            {
                getMyColour: function() {
                    return me.getMyColour(me);
                },
                canDrag: function() {
                    return me.getCanDrag();
                },
                getActionsGear: function() {
                    return me._buildActionsGearHtml();
                },
                getFormattedId: function() {
                    var record = me.getRecord();
                    return record.getField('FormattedID') ? Rally.ui.renderer.RendererFactory.renderRecordField(record, 'FormattedID') : '';
                },
                getSeparator: function() {
                    return this.getFormattedId() ? '- ' : '';
                },
                getOwner: function() {
                    var record = me.getRecord();
                    return record.getField('Owner') ? Rally.ui.renderer.RendererFactory.renderRecordField(record, 'Owner') : '';
                }
            }
        );
    },

    draw: function() {
        var me = this;

        if (this.content) {
            this.content.destroy();
        }

        var cls = 'treeItemContent';
        if (this.getSelectable()) {
            cls += ' selectable';
        }

        if (!this.expander) {
            this.expander = this.drawExpander();
        } else {
            this.toggleExpander();
        }

        //Get from the app store all the records for a node and make sure all the parent nodes are notified of their presence


        this.insert(1, {

            xtype: 'container',
            itemId: 'treeItemContent',
            cls: cls,
            layout: {
                type: 'hbox'
            },
            items: [
                {
                    xtype: 'component',
                    renderTpl: this.getContentTpl(),
                    renderData: this.getRenderData(),
                    listeners: {
                        afterrender: function() {
                            this.setupListeners();
                            this.fireEvent('draw');
                        },
                        scope: this
                    }
                }
            ]
        });

    }
});

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    itemId: 'userApp',
    id: 'userApp',
    stateful: true,

    permColours: {
        'Admin' : 'orange' ,
        'User'  : 'white' ,
        'Viewer' : 'lightblue',
        'Editor' : 'lightgreen'
    },

    items: [

        {
            xtype: 'container',
            layout: 'hbox',
            items: [
                {
                    xtype: 'rallyusersearchcombobox',
                    id: 'userSelector',
                    fieldLabel: 'Choose a user: '
                },
                {
                    xtype: 'container',
                    html: '<div style="margin-left: 10px; padding-left: 10px;padding-right: 20px">Permission Colour Coding:   </div>'
                },
                {
                    xtype: 'container',
                    html: '<div style="margin-left: 10px; padding-left: 3px; padding-right: 10px; border-left: 5px solid red">Workspace Admin</div>'
                },
                {
                    xtype: 'container',
                    html: '<div style="margin-left: 10px; padding-left: 3px; padding-right: 10px; border-left: 5px solid orange">Project Admin</div>'
                },
                {
                    xtype: 'container',
                    html: '<div style="margin-left: 10px; padding-left: 3px; padding-right: 10px; border-left: 5px solid lightgreen">Project Editor</div>'
                },
                {
                    xtype: 'container',
                    html: '<div style="margin-left: 10px; padding-left: 3px; padding-right: 10px; border-left: 5px solid lightblue">Project Viewer</div>'
                }
            ]
        }
    ],

    _fetchUserPermissions: function() {

        Deft.Chain.parallel([
            this._getProjectPerms,
            this._getWorkspacePerms
        ], this).then ({
            success: function() {
                this._redrawTree();
            },
            failure: function() {
                console.log('Failed to fetch user permissions');
            },
            scope: this
        });
    },

    projectPerms: null,

    _getProjectPerms: function() {

        var me = this;

        var deferred = Ext.create('Deft.Deferred');

        //Get the user reord from the selector
        var record = Ext.getCmp('userSelector').getRecord();

        //Selector can have a null entry
        if (record) {
            var perStore = Ext.create('Rally.data.wsapi.Store', {
                model: 'projectpermission',
                autoLoad: true,
                pageSize: 2000,
                filters: [
                    {
                        property: 'User',
                        value: record.get('_ref')
                    },
                    {
                        property: 'Workspace',
                        value: me.getContext().getWorkspace()._ref
                    }
                ],
                listeners: {
                    load: function(store, data, success) {
                        if (success) {
                            me.projectPerms = data;
                            deferred.resolve(data);
                        }
                        else {
                            deferred.reject();
                        }
                    }
                }
            });
        }
        return deferred.promise;
    },

    _projectRights: function() {
        return false;
    },

    _getProjectColour: function(record) {

        //Find the records project ID in the projectPermissions store

        var roleRecord = _.find (this.projectPerms, function (perm) {
            return perm.data.Project._ref === record.data._ref;
        });

        return roleRecord ? this.permColours[roleRecord.data.Role] : 'white';

    },

    workspacePerms: null,

    _getWorkspacePerms: function() {

        var me = this;

        var deferred = Ext.create('Deft.Deferred');

        //Get the user reord from the selector
        var record = Ext.getCmp('userSelector').getRecord();

        //Selector can have anull entry
        if (record) {
            var perStore = Ext.create('Rally.data.wsapi.Store', {
                model: 'workspacepermission',
                autoLoad: true,
                pageSize: 2000,
                filters: [
                    {
                        property: 'User',
                        value: record.get('_ref')
                    },
                    {
                        property: 'Workspace',
                        value: me.getContext().getWorkspace()._ref
                    }
                ],
                listeners: {
                    load: function(store, data, success) {
                        if (success) {
                            me.workspacePerms = data;
                            deferred.resolve(data);
                        }
                        else {
                            deferred.reject();
                        }
                    }
                }
            });
        }
        return deferred.promise;
    },

    _workspaceRights: function() {
        //Get the data on the workspace for this user to find highest permissions Note: should only be ONE entry
        return this.workspacePerms[0] && (this.workspacePerms[0].get('Role') === 'Admin');
    },

    _getWorkspaceColour: function() {
        return this._workspaceRights()? 'red' : 'white';
    },

    _redrawTree: function() {

        var currentTree = this.down('#projectTree');
        if (currentTree) { currentTree.destroy(); }
//        console.log('Redrawing tree for ', this.workspacePerms[0].get('User')._refObjectName);
        this._drawTree();

    },

    _drawTree: function() {

        var pt = Ext.create( 'Rally.ui.tree.ProjectTree', {

            id: 'projectTree',
            itemId: 'projectTree',

            config: {
                treeItemConfigForRecordFn:  function(record) {
                    if (record.get('_type') === 'workspace'){
                        return { xtype: 'rallyplaintreeitem' };
                    }
                    else {
                        return {
                            xtype: 'extendedTreeItem',
                            selectable: true
                        };
                    }
                },
                topLevelStoreConfig: {
                    fetch: ['Name', 'State', 'Workspace'],
                    filters: [{
                        property: 'State',
                        value: 'Open'
                    }, {
                        property: 'Projects.State',
                        value: 'Open'
                    }],
                    sorters: [{
                        property: 'Name',
                        direction: 'ASC'
                    }],
                    context: function() { app._getContext(app); }
                },

                childItemsStoreConfigForParentRecordFn: function(record){

                    var storeConfig = {
                        fetch: ['Name', 'Description', 'Owner', 'Children:summary[State]', 'State', 'Workspace'],
                        hydrate: ['Owner'],
                        sorters: [{
                            property: 'Name',
                            direction: 'ASC'
                        }]
                    };

                    if(record.get('_type') === 'workspace'){
                        return Ext.apply(storeConfig, {
                            filters: [{
                                property: 'Parent',
                                value: 'null'
                            }],
                            context: {
                                workspace: record.get('_ref'),
                                project: null
                            }
                        });
                    } else {
                        return Ext.apply(storeConfig, {
                            filters: [{
                                property: 'Parent',
                                value: record.get('_ref')
                            }],
                            context: {
                                workspace: record.get('Workspace')._ref,
                                project: null
                            }
                        });
                    }
                }
            }
       });

       this.add(pt);

    },

    getSettingsFields: function() {
        var me = this;
        return [
            {
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Auto expand tree on load',
                labelWidth: 200,
                name: 'autoExpand'
            }
        ];
    },

    launch: function() {

        var app = this;

        //Get the user from the selector and fetch all the userpermissions for them.

        var userSelected = Ext.getCmp('userSelector');

        userSelected.on('change', this._fetchUserPermissions, this);

    }

});
