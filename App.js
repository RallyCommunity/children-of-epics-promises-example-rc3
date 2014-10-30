Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    launch: function() {
        var that = this;
        var millisecondsInDay = 86400000;
        var currentDate = new Date();
        var startDate = new Date(currentDate - millisecondsInDay*30); //in the last 30 days
        var startDateUTC = startDate.toISOString();
        var stories = Ext.create('Rally.data.wsapi.Store', {
            model: 'UserStory',
            fetch: ['Name','FormattedID','Children','Project','ScheduleState','Parent'],
            filters: [
                {
                    property: 'DirectChildrenCount',
                    operator: '>',
                    value: 0
                },
                {
                    property: 'LastUpdateDate',
                    operator: '>',
                    value: startDateUTC
                }
            ]
        });
        stories.load().then({
            success: this.loadChildren,
            scope: this
        }).then({
            success:function(results) {
                console.log('results', results);
                that.makeGrid(results);
            },
            failure: function(){
                console.log("oh noes!");
            }
        });
    },
    
    loadChildren: function(stories){
        var promises = [];
        _.each(stories, function(story){
            var children = story.get('Children');
            if (children.Count > 0) {
                children.store = story.getCollection('Children',{fetch:['Name','FormattedID','Parent','Project','ScheduleState']}); //filters:{property: 'ScheduleState',operator: '>',value: 'Defined'}
                promises.push(children.store.load());
            }
        });
        return Deft.Promise.all(promises);
    },
    
     
    makeGrid: function(results){
        var children = _.flatten(results);
        var data = [];
        _.each(children, function(child){
            data.push(child.data);
        });
        
        _.each(data, function(record){
            record.Epic = record.Parent.FormattedID + " " + record.Parent.Name;
        });

        
        this.add({
            xtype: 'rallygrid',
            showPagingToolbar: true,
            showRowActionsColumn: true,
            editable: false,
            store: Ext.create('Rally.data.custom.Store', {
                data: data,
                groupField: 'Epic'
            }),
            features: [{ftype:'groupingsummary'}],
            columnCfgs: [
                {
                    xtype: 'templatecolumn',text: 'ID',dataIndex: 'FormattedID',width: 100,
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                },
                {
                    text: 'Name',dataIndex: 'Name'
                },
                {
                    text: 'Project',dataIndex: 'Project',
                    renderer:function(value){
                        return value.Name;
                    }
                },
                {
                    text: 'ScheduleState',dataIndex: 'ScheduleState',xtype: 'templatecolumn',
                        tpl: Ext.create('Rally.ui.renderer.template.ScheduleStateTemplate',
                            {
                                states: ['Defined', 'In-Progress', 'Completed','Accepted'],
                                field: {
                                    name: 'ScheduleState' 
                                }
                        })
                },
                {
                    text: 'Parent Story',dataIndex: 'Parent',
                    renderer: function(val, meta, record) {
                        return '<a href="https://rally1.rallydev.com/#/detail/userstory/' + record.get('Parent').ObjectID + '" target="_blank">' + record.get('Parent').FormattedID + '</a>';
                    }
                },
                {
                    text: 'Project of Parent Story',dataIndex: 'Parent',
                    renderer: function(val, meta, record) {
                        return record.get('Parent').Project.Name;
                    }
                }
            ]
        });
        
    }
});
