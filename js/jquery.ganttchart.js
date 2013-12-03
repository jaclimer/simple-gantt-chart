/*
    Gantt Chart was designed to work for Internet Explorer 8.  It requires jQuery, jQuery.ui and date.js.
*/

/* Make jquery plugin */
; (function ($) {
    $.fn.ganttchart = function (options) {
        var ganttChart = new GanttChart();
        ganttChart.init('id', $(this), options);
    };
})(jQuery);

/* Setup the GanttChart main object */
function GanttChart() {
    var self = this;
    
    this.id;
    this.parentElement;
    this.taskListHeader;
    this.tasks = [];
    this.zoomLevels = ['d', 'w', 'm'];

    // See comments for 'init' for details
    this.settings = {
        zoom: 0,                                                // level zoom
        startDate: new Date().add('d', -2),                     // Start two days ago
        endDate: new Date().add('d', 365),                      // End 365 days from now
        collapseChildTasks: false,                              // Do not collapse rows
        rowHeight: 20,                                          // Rowheight does not include border widths (defaulted 2px (1px ea))
        taskbarHeight: 18,                                      // TaskbarHeight
        showProgressBar: true,                                  // Show the progress bar in the task bar
        milestoneHeight: 16,
        milestoneWidth: 16,                                     // Milestone dimensions      
        data:null                                               // Data to load into the chart
    };
}

/* Initialized the gantt chart */
GanttChart.prototype.init = function (id, parentElement, optionalParams) {
    var _self = this;
    this.id = id;
    this.parentElement = parentElement;
    optionalParams = optionalParams || {};

    // Check optionalParams
    if (optionalParams.zoom) this.settings.zoom = optionalParams.zoom;
    if (optionalParams.startDate) this.settings.startDate = optionalParams.startDate;
    if (optionalParams.endDate) this.settings.endDate = optionalParams.endDate;
    if (optionalParams.collapseChildTasks) this.settings.collapseChildTasks = optionalParams.collapseChildTasks;
    if (optionalParams.data) this.settings.data = optionalParams.data;

    // If data source url was supplied, load data
    if (optionalParams.dataSourceUrl) {
        this.loadTasks(optionalParams.dataSourceUrl, null);
    } else {
        if (this.settings.data) {
            this.loadTasks(null, this.settings.data);
        }
    }
};

/* Add a new task */
GanttChart.prototype.addTask = function(id, level, name, start, end, status, color, progress, milestones) {
    var newTask = new GanttChartTask();

    newTask.id = id;
    newTask.level = level;
    newTask.name = name;
    newTask.start = start;
    newTask.end = end;
    newTask.status = status;
    newTask.color = color;
    newTask.progress = progress;

    var newMilestones = new Array();
    if (milestones != null) {
        for (var m = 0; m < milestones.length; ++m) {
            var newMilestone = new GanttChartMilestone();

            newMilestone.milestonedate = milestones[m].milestonedate;
            newMilestone.label = milestones[m].label;
            
            newMilestones.push(newMilestone);
        }
    }

    newTask.milestones = newMilestones;

    this.tasks.push(newTask);
};

/* Load the gantt chart from a data source */
GanttChart.prototype.loadTasks = function(src, data) {
    var _self = this;
    
    // Load the data (taskData) whether from url (src) or manually passed-in (data)
    function loadData(taskData) {
        _self.taskListHeader = taskData.tasksHeader;
        var taskList = taskData.tasks;

        // Clear existing tasks
        _self.tasks = [];

        // Establish min and max dates
        var minTaskDate = new Date();
        var maxTaskDate = new Date();

        for (var i = 0; i < taskList.length; ++i) {
            var newTask = taskList[i];

            if (newTask.start < minTaskDate) minTaskDate = newTask.start;
            if (newTask.end > maxTaskDate) maxTaskDate = newTask.end;

            _self.addTask(newTask.id, newTask.level, newTask.name, newTask.start, newTask.end, newTask.status, newTask.color, newTask.progress, newTask.milestones);
        }

        // Create updated 
        _self.settings.startDate = new Date(minTaskDate).add('d', -2);
        _self.settings.endDate = new Date(maxTaskDate).add('d', 2);

        // Setup the chart
        _self.setupChart();
    }

    // First check for a url data source (src), if not found then check to see
    // if a data object has been passed
    if (src) {
        $.ajax({
            url: src,
            success: function(ganttChartData) {
                loadData(ganttChartData);
            },
            error: function(e) {
                alert('Failed to load tasks');
            }
        });
    } else {
        if (data) {
            loadData(data);
        }
    }
};

// Setup the chart (after tasks have been loaded)
GanttChart.prototype.setupChart = function () {
    var _self = this;
    
    // Build gantt chart framework html
    var $gantt = $("<DIV />").addClass("gantt");                                                            // Gantt
    
    // Setup task list (left panel)
    var $taskList = $("<DIV />").addClass("gantt-task-list-panel");                                         // Task list panel
    $taskList.append($("<DIV />").addClass("gantt-task-list-header")
                                 .append($('<DIV />').addClass("gantt-task-list-header-label")
                                 .html(_self.taskListHeader)));                                             // Task list header
    var $taskListTable = $("<DIV />").addClass("gantt-task-list");                                          // Task list
    $taskList.append($taskListTable);
    $gantt.append($taskList);
  
    // Setup chart (right panel)
    var $chartPanel = $("<DIV />").addClass("gantt-chart-panel");                                           // Gantt chart panel
    $chartPanel.append($("<DIV />").addClass("gantt-chart-header"));                                        // Gantt chart header
    $chartPanel.append($("<DIV />").addClass("gantt-chart"));                                               // Gantt chart                                                                              // Apply drag scroll
    $gantt.append($chartPanel);

    // Insert the gantt-chart into the DOM
    _self.parentElement.append($gantt);
    
    // Populate the tasklist and chart
    _self.redrawTaskList();
    _self.redrawChart();
};

/* Adjusts the heights and widths of the panels that make up the gantt chart and setup zoom and scroll events */
GanttChart.prototype.finalizeGanttChart = function (taskListWidth) {
    var _self = this;
    
    // Header height
    var $chart = $(this.parentElement);
    var $taskHeader = $chart.find('.gantt-task-list-header');
    var $taskTable = $chart.find('.gantt-task-list-table');
    var $chartHeader = $chart.find('.gantt-chart-header');
    var $chartTable = $chart.find('.gantt-chart-table');
    var headerHeight = Math.max($taskHeader.height(), $chartHeader.height());
  
    $taskHeader.height(headerHeight);
    $chartHeader.height(headerHeight);
    $taskTable.css('margin-top', headerHeight);                                                     // Adjust chart for header height
    $chartTable.css('margin-top', headerHeight);                                                    // Adjust chart for header height

    // Task List width
    taskListWidth = taskListWidth || 200;
    $taskHeader.width(taskListWidth);
    $chart.find('.gantt-task-list-panel').width(taskListWidth);

    // Chart width
    var $chartPanel = $chart.find('.gantt-chart-panel');
    var $ganttChart = $chart.find('.gantt-chart-container');
    var chartWidth = $chart.width() - taskListWidth;
    $chartHeader.width(chartWidth);
    $chartPanel.width(chartWidth);
    $ganttChart.width(chartWidth);
    
    // Chart height
    var $ganttTaskList = $chart.find('.gantt-task-list');
    var chartHeight = $chart.height();
    $ganttChart.height(chartHeight);
    $ganttTaskList.height(chartHeight);
    $chart.find('.gantt-chart-table tr td').height($taskTable.height() - 2);                        // Make table cells same height as task list
    
    // Today line height
    $('.gantt-line-today').css({ height: $chartTable.height() + headerHeight });
    
    // Setup drag scroll and scroll syncing with headers
    $ganttChart.dragScroll();
    $ganttChart.on("scroll", function (e) {
        $ganttTaskList.scrollTop($ganttChart.scrollTop());
        $chartHeader.scrollLeft($ganttChart.scrollLeft());
    });

    // Attach middle mouse button to zoom
    $ganttChart.bind("mousewheel", function (e) {
        if (e.originalEvent.wheelDelta > 0) {
            // Scroll forward
            _self.zoomIn();
        } else {
            // Scroll backward
            _self.zoomOut();
        }

        e.preventDefault();
    });
};

/* Draws or redraws the task list table */
GanttChart.prototype.redrawTaskList = function() {
    var _self = this;

    // Create the task list table on the left side of the chart
    function createTaskListTable() {
        var _$taskListTable = $("<TABLE />").addClass('gantt-task-list-table');

        for (var i = 0; i < _self.tasks.length; ++i) {
            var task = _self.tasks[i];

            if (!_self.settings.collapseChildTasks || task.level == 0) {
                _$taskListTable.append($('<TR />').attr('data-id', task.id)
                                                .attr('data-level', task.level)
                                                .css('height', _self.settings.rowHeight)
                                                .css('background-color', task.color)
                                                .append(($('<TD />')
                                                    .append($('<DIV />').html(task.name)
                                                        .addClass('gantt-task-list-label')
                                                        .css('padding-left', task.level * 15)))));
            }
        }

        return _$taskListTable;
    }
    
    _self.parentElement.find(".gantt-task-list").html(createTaskListTable());
};

/* Draws or redraws the chart headers and task bars */
GanttChart.prototype.redrawChart = function () {
    var _self = this;

    // Draw the header and chart based on the zoom.  Each zoom level
    // should have a corresponding drawer object with two properties:
    // createChartHeader and createChart
    var drawer = new GanttDrawer(_self);
    switch (_self.settings.zoom) {
        case 0:                             // Daily
            drawer.getDailyDrawer();
            break;
        case 1:                             // Weekly
            drawer.getWeeklyDrawer();
            break;
        case 2:                             // Monthly
            drawer.getMonthlyDrawer();
            break;
        case 3:                             // Quarterly
            drawer.getQuarterlyDrawer();
            break;
        case 4:                             // Yearly
            drawer.getYearlyDrawer();
            break;
    }
    
    // Get current scroll location based on percentage of the width of the chart (y is the same regardless of zoom)
    var $ganttChartTable = _self.parentElement.find(".gantt-chart-table");
    var $ganttChartContainer = _self.parentElement.find(".gantt-chart-container");
    var scrollPosX = $ganttChartContainer.scrollLeft() / $ganttChartTable.width();
    var scrollPosY = $ganttChartContainer.scrollTop();
    
    // Draw chart header
    _self.parentElement.find(".gantt-chart-header").html(drawer.createChartHeader);
    
    // Draw chart
    _self.parentElement.find(".gantt-chart").html(drawer.createChart);
    
    // Align chart panels
    _self.finalizeGanttChart();
    
    // Draw task bars
    drawer.drawTaskbars();
    
    // Return scroll position
    if (scrollPosX) {
        $ganttChartTable = _self.parentElement.find(".gantt-chart-table");
        $ganttChartContainer = _self.parentElement.find(".gantt-chart-container");
        $ganttChartContainer.scrollLeft($ganttChartTable.width() * scrollPosX);
        $ganttChartContainer.scrollTop(scrollPosY);
    }
};

/* Zoom in */
GanttChart.prototype.zoomIn = function() {
    var _self = this;
    
    // Change the zoom level and redraw the chart (if not at max zoom)
    if (_self.settings.zoom > 0) {
        _self.settings.zoom--;
        _self.redrawChart();
    }
};

/* Zoom out */
GanttChart.prototype.zoomOut = function() {
    var _self = this;
    
    // Change the zoom level and redraw the chart (if not at max zoom)
    if (_self.settings.zoom < _self.zoomLevels.length - 1) {
        _self.settings.zoom++;
        _self.redrawChart();
    }
};

/* Collapse tasks */
GanttChart.prototype.collapseTasks = function () {
    var _self = this;

    _self.settings.collapseChildTasks = true;
    _self.redrawTaskList();
    _self.redrawChart();

};

/* Expand tasks */
GanttChart.prototype.expandTasks = function () {
    var _self = this;

    _self.settings.collapseChildTasks = false;
    _self.redrawTaskList();
    _self.redrawChart();
};

// Task structure
function GanttChartTask() {
    this.id;
    this.level;
    this.name;
    this.start;
    this.end;
    this.status;
    this.color;
    this.progress;
    this.milestones;
};

// Milestone structure
function GanttChartMilestone() {
    this.milestonedate;
    this.label;
}

/* Charts for different zoom levels */
function GanttDrawer(gantt) {
    this.gantt = gantt;
    this.createChartHeader = null;
    this.createChart = null;
    this.drawTaskbars = function() { return null; };
}

/* Daily drawer */
GanttDrawer.prototype.getDailyDrawer = function () {
    var _self = this;
    var _settings = _self.gantt.settings;

    // Setup header and chart tables
    var $ganttHeaderTable = $('<TABLE />').addClass('gantt-header-table');
    var $chartTable = $("<TABLE />").addClass('gantt-chart-table').addClass("no-select");

    // Display a cell for everyday in the week
    var periodWidth = 36;                                                                           // 1 day = 36px
    var periodCount = new Date().dayDiff(_settings.endDate, _settings.startDate);
    var todayOffset = ((new Date().dayDiff(_settings.startDate, new Date())) * (periodWidth + 1)) + (periodWidth / 2);

    // Main header will contain Months
    var $trHeader1 = $('<TR />');
    var $trHeader2 = $('<TR />');

    // Chart row
    var $trChart = $('<TR />');

    // Weekend offset (use mod(%) to find sat and sun from a running day counter
    var dayCounter = _settings.startDate.getDay() + 7;                                              // Offset by one week to remove 0
    var isWeekend = false;

    var monthCount = new Date().monthDiff(_settings.startDate, _settings.endDate) + 1;              // Add one month to include current month

    for (var m = 0; m < monthCount; ++m) {
        var tempDate = new Date(_settings.startDate).add('M', m);
        var daysInMonth = tempDate.numberOfDaysInMonth();
        var startDay = (m > 0) ? 1 : _settings.startDate.getDate();
        var dayCount = (m > 0) ? daysInMonth : daysInMonth - tempDate.getDate() + 1;

        // If the last month, only go to the end date with number of days
        if (m == monthCount - 1) {
            dayCount = _settings.endDate.getDate();
            daysInMonth = dayCount;
        }

        $trHeader1.append($('<TH />').attr('colspan', dayCount).html(tempDate.getMonthName() + ' ' + tempDate.format('yyyy')));

        for (var d = startDay; d < daysInMonth + 1; ++d) {
            isWeekend = (dayCounter % 7 == 0) || ((dayCounter + 1) % 7 == 0);
            $trHeader2.append($('<TH />').addClass((isWeekend) ? 'weekend' : 'weekday').html(d).css('min-width', periodWidth));
            $trChart.append($('<TD />').addClass((isWeekend) ? 'weekend' : 'weekday').html('&nbsp;').css('min-width', periodWidth));
            dayCounter++;
        }
    }

    $ganttHeaderTable.append($trHeader1);
    $ganttHeaderTable.append($trHeader2);
    $chartTable.append($trChart);
    
    // Draw task bars
    var $chart = $('<DIV />').addClass('gantt-chart-container').append($chartTable);
    
    // Draw a red line for today
    var $todayLine = $('<DIV />').addClass('gantt-line-today');
    $todayLine.css({ left: todayOffset });
    $chart.append($todayLine);
    
    // Set chart header property
    _self.createChartHeader = $ganttHeaderTable;
    _self.createChart = $chart;

    // Override draw taskbars
    _self.drawTaskbars = function() {
        var headerHeight = _self.gantt.parentElement.find('.gantt-task-list-header').height();
        tempDate = new Date();
        for (var t = 0; t < _self.gantt.tasks.length; ++t) {
            var task = _self.gantt.tasks[t];

            if (!_settings.collapseChildTasks || task.level == 0) {

                var taskStart = new Date(task.start);
                var taskEnd = new Date(task.end);
                var duration = tempDate.dayDiff(taskEnd, taskStart);
                var description = task.name + ' (' + taskStart.format('MM/dd/yy') + ' - ' + taskEnd.format('MM/dd/yy') + ') [' + duration + ' days]' + (_settings.showProgressBar ? '\nProgress: ' + task.progress + '%' : '');
                var $taskbar = $('<DIV />').addClass('gantt-chart-taskbar')
                                            .attr('data-id', task.id)
                                            .attr('data-level', task.level)
                                            .attr('title', description)
                                            .css('background-color', task.color)
                                            .css('height', _settings.taskbarHeight)
                                            .html(task.name);

                // Now for the math
                var $taskListRow = $(_self.gantt.parentElement.find('.gantt-task-list-table tr[data-id=' + task.id + ']'));
                var taskbarTop = $taskListRow.position().top + headerHeight;
                var taskStartOffset = tempDate.dayDiff(taskStart, _settings.startDate) * (periodWidth + 1);
                $taskbar.css({ top: taskbarTop, left: taskStartOffset + 1, width: ((duration + 1) * (periodWidth + 1)) - 2 }); // Adjusted for border widths
                
                // Add progress bar
                if (_settings.showProgressBar) {
                    var $progressBar = $('<DIV />').addClass('gantt-chart-taskbar-progressbar');
                    var pbWidth = $taskbar.width() * (task.progress / 100);
                    var pbTop = $taskbar.height() - 3;
                    $taskbar.append($progressBar.css({ top: pbTop, width: pbWidth }));
                }
                
                // Add milestones
                for (var m = 0; m < task.milestones.length; ++m) {
                    var milestone = task.milestones[m];
                    var $milestone = $('<DIV />').addClass('gantt-chart-taskbar-milestone').attr('title', milestone.label);
                    var mLeft = ((tempDate.dayDiff(milestone.milestonedate, taskStart) + 1) * (periodWidth + 1)) + (periodWidth/2 - _settings.milestoneWidth/2);
                    var mTop = $taskbar.height() - (_settings.milestoneHeight + 1);
                    $taskbar.append($milestone.css({ left: mLeft, top: mTop }));
                }
                
                $chart.append($taskbar);
            }
        }
    };
};

/* Weekly drawer */
GanttDrawer.prototype.getWeeklyDrawer = function () {
    var _self = this;
    var _settings = _self.gantt.settings;

    // Setup header and chart tables
    var $ganttHeaderTable = $('<TABLE />').addClass('gantt-header-table');
    var $chartTable = $("<TABLE />").addClass('gantt-chart-table').addClass("no-select");

    // Display a cell for everyday in the week
    var periodWidth = 20;                                                                                   // 1 day = 20px
    var startDayOffset = _settings.startDate.getDay() * -1;
    var adjStartDate = new Date(_settings.startDate).add('d', startDayOffset);                              // Adjust start date to prev Sunday
    var endDayOffset = 6 - _settings.endDate.getDay();
    var adjEndDate = new Date(_settings.endDate).add('d',  endDayOffset);                                   // Adjust end date to next Saturday
    var periodCount = new Date().dayDiff(adjEndDate, adjStartDate) + 1;
    var todayOffset = ((new Date().dayDiff(adjStartDate, new Date())) * (periodWidth + 1)) + (periodWidth / 2);

    // Main header will contain Months
    var $trHeader1 = $('<TR />');
    var $trHeader2 = $('<TR />');

    // Chart row
    var $trChart = $('<TR />');

    // Draw chart
    var isWeekend = false;
    var weekCount = periodCount / 7;
    

    for (var w = 0; w < weekCount; ++w) {
        var startDate = new Date(adjStartDate).add('d', (w * 7));
        var endDate = new Date(startDate).add('d', 6);
        var dayCount = 7;

        var weekHeader = startDate.getMonthAbbreviation() + ' ' + startDate.getDate() + ' - ' + endDate.getMonthAbbreviation() + ' ' + endDate.getDate() + '\'' + endDate.format('yy');
        $trHeader1.append($('<TH />').attr('colspan', dayCount).html(weekHeader));

        for (var d = 0; d < dayCount; ++d) {
            isWeekend = (d == 0) || (d == 6);
            $trHeader2.append($('<TH />').addClass((isWeekend) ? 'weekend' : 'weekday').html(Date.dayFirstLetters[d]).css('min-width', periodWidth));
            $trChart.append($('<TD />').addClass((isWeekend) ? 'weekend' : 'weekday').html('&nbsp;').css('min-width', periodWidth));
        }
    }

    $ganttHeaderTable.append($trHeader1);
    $ganttHeaderTable.append($trHeader2);
    $chartTable.append($trChart);
    
    // Draw task bars
    var $chart = $('<DIV />').addClass('gantt-chart-container').append($chartTable);
    
    // Draw a red line for today
    var $todayLine = $('<DIV />').addClass('gantt-line-today');
    $todayLine.css({ left: todayOffset });
    $chart.append($todayLine);

    // Set chart header property
    _self.createChartHeader = $ganttHeaderTable;
    _self.createChart = $chart;
    
    // Override draw taskbars
    _self.drawTaskbars = function () {
        var headerHeight = _self.gantt.parentElement.find('.gantt-task-list-header').height();
        var tempDate = new Date();
        for (var t = 0; t < _self.gantt.tasks.length; ++t) {
            var task = _self.gantt.tasks[t];

            if (!_settings.collapseChildTasks || task.level == 0) {

                var taskStart = new Date(task.start);
                var taskEnd = new Date(task.end);
                var duration = tempDate.dayDiff(taskEnd, taskStart);
                var description = task.name + ' (' + taskStart.format('MM/dd/yy') + ' - ' + taskEnd.format('MM/dd/yy') + ') [' + duration + ' days]' + (_settings.showProgressBar ? '\nProgress: ' + task.progress + '%' : '');
                var $taskbar = $('<DIV />').addClass('gantt-chart-taskbar')
                                            .attr('data-id', task.id)
                                            .attr('data-level', task.level)
                                            .attr('title', description)
                                            .css('background-color', task.color)
                                            .css('height', _settings.taskbarHeight)
                                            .html(task.name);

                // Now for the math
                var $taskListRow = $(_self.gantt.parentElement.find('.gantt-task-list-table tr[data-id=' + task.id + ']'));
                var taskbarTop = $taskListRow.position().top + headerHeight;
                var taskStartOffset = tempDate.dayDiff(taskStart, _settings.startDate) * (periodWidth + 1);
                $taskbar.css({ top: taskbarTop, left: taskStartOffset - (startDayOffset * (periodWidth + 1)) + 1, width: ((duration + 1) * (periodWidth + 1)) - 2 }); // Adjusted for border widths
                
                // Add progress bar
                if (_settings.showProgressBar) {
                    var $progressBar = $('<DIV />').addClass('gantt-chart-taskbar-progressbar');
                    var pbWidth = $taskbar.width() * (task.progress / 100);
                    var pbTop = $taskbar.height() - 3;
                    $taskbar.append($progressBar.css({ top: pbTop, width: pbWidth }));
                }
                
                // Add milestones
                for (var m = 0; m < task.milestones.length; ++m) {
                    var milestone = task.milestones[m];
                    var $milestone = $('<DIV />').addClass('gantt-chart-taskbar-milestone').attr('title', milestone.label);
                    var mLeft = ((tempDate.dayDiff(milestone.milestonedate, taskStart) + 1) * (periodWidth + 1)) + (periodWidth / 2 - _settings.milestoneWidth / 2);
                    var mTop = $taskbar.height() - (_settings.milestoneHeight + 1);
                    $taskbar.append($milestone.css({ left: mLeft, top: mTop }));
                }
                
                $chart.append($taskbar);
            }
        }
    };
};

/* Monthly drawer */
GanttDrawer.prototype.getMonthlyDrawer = function() {
    var _self = this;
    var _settings = _self.gantt.settings;

    // Setup header and chart tables
    var $ganttHeaderTable = $('<TABLE />').addClass('gantt-header-table');
    var $chartTable = $("<TABLE />").addClass('gantt-chart-table').addClass("no-select");

    // Display a cell for every month in the year
    var periodWidth = 100;                                                                                  // 1 month = 100px
    var startDayOffset = (_settings.startDate.getDate() - 1) * -1;
    var adjStartDate = new Date(_settings.startDate).add('d', startDayOffset);                                                          // Adjust start date to first of month
    var endDayOffset = _settings.endDate.numberOfDaysInMonth() - _settings.endDate.getDate();                 // Adjust end date to end of month
    var adjEndDate = new Date(_settings.endDate).add('d', endDayOffset);
    var periodCount = new Date().monthDiff(adjStartDate, adjEndDate);
    var today = new Date();
    var todayOffset = (new Date().monthDiff(adjStartDate, today) * (periodWidth + 1)) + (periodWidth * (today.getDate() / 30));
    
    // Loop through years
    var startYear = adjStartDate.getFullYear();
    var endYear = adjEndDate.getFullYear();
    
    // Setup headers
    var $trHeader1 = $('<TR />');
    var $trHeader2 = $('<TR />');

    // Chart row
    var $trChart = $('<TR />');

    // Loop through the years
    for (var y = startYear; y < endYear + 1; ++y) {
        var startMonth = (y == startYear) ? adjStartDate.getMonth() : 0;
        var endMonth = (y == endYear) ? adjEndDate.getMonth() : 11;
        var monthsInYear = endMonth - startMonth;
        
        // Add year header
        $trHeader1.append($('<TH />').attr('colspan', monthsInYear + 1).html(y));

        // Loop through the months
        for (var m = startMonth; m < endMonth + 1; ++m) {
            $trHeader2.append($('<TH />').attr('colspan', 1).html(Date.monthNames[m]).css('min-width', periodWidth));
            $trChart.append($('<TD />').html('&nbsp;').css('min-width', periodWidth));
        }
        
        $ganttHeaderTable.append($trHeader1);
        $ganttHeaderTable.append($trHeader2);
    }
    
    $chartTable.append($trChart);

    // Set table width (add 2 to period width to adjust for cell borders)
    $ganttHeaderTable.width((periodWidth + 1) * periodCount);
    $chartTable.width((periodWidth + 1) * periodCount);
    
    // Draw task bars
    var $chart = $('<DIV />').addClass('gantt-chart-container').append($chartTable);
    
    // Draw a red line for today
    var $todayLine = $('<DIV />').addClass('gantt-line-today');
    $todayLine.css({ left: todayOffset });
    $chart.append($todayLine);

    // Set chart header property
    _self.createChartHeader = $ganttHeaderTable;
    _self.createChart = $chart;
    
    // Override draw taskbars
    _self.drawTaskbars = function () {
        var headerHeight = _self.gantt.parentElement.find('.gantt-task-list-header').height();
        var tempDate = new Date();
        for (var t = 0; t < _self.gantt.tasks.length; ++t) {
            var task = _self.gantt.tasks[t];

            if (!_settings.collapseChildTasks || task.level == 0) {

                var taskStart = new Date(task.start);
                var taskEnd = new Date(task.end);
                var duration = tempDate.dayDiff(taskEnd, taskStart);
                var description = task.name + ' (' + taskStart.format('MM/dd/yy') + ' - ' + taskEnd.format('MM/dd/yy') + ') [' + duration + ' days]' + (_settings.showProgressBar ? '\nProgress: ' + task.progress + '%' : '');
                var $taskbar = $('<DIV />').addClass('gantt-chart-taskbar')
                                            .attr('data-id', task.id)
                                            .attr('data-level', task.level)
                                            .attr('title', description)
                                            .css('background-color', task.color)
                                            .css('height', _settings.taskbarHeight)
                                            .html(task.name);

                // Now for the math
                var $taskListRow = $(_self.gantt.parentElement.find('.gantt-task-list-table tr[data-id=' + task.id + ']'));
                var taskbarTop = $taskListRow.position().top + headerHeight;
                
                // Calculate task width by breaking down a month by percentage of days by days in the month
                var taskStartDay = taskStart.getDate();
                var daysInStartMonth = taskStart.numberOfDaysInMonth();
                var percentOfStartMonth = (taskStartDay / daysInStartMonth);
                
                var taskStartOffset = tempDate.monthDiff(adjStartDate, taskStart) * (periodWidth + 1) +
                                      percentOfStartMonth * (periodWidth + 1);

                var monthCount = tempDate.monthDiff(taskStart, taskEnd);
                var taskEndDay = taskEnd.getDate();
                var daysInEndMonth = taskEnd.numberOfDaysInMonth();
                var percentOfEndMonth = (taskEndDay / daysInEndMonth);

                var taskWidth = ((1 - percentOfStartMonth) * (periodWidth + 1)) +                            // Width of 1st month to include in the task
                                ((monthCount > 0) ? monthCount * (periodWidth + 1) : 0) -                    // Period width times the number of full months in the task period
                                (1- percentOfEndMonth) * (periodWidth + 1);                                  // Width of the final month

                
                $taskbar.css({ top: taskbarTop, left: taskStartOffset, width: taskWidth });                  // Adjusted for border widths
                
                // Add progress bar
                if (_settings.showProgressBar) {
                    var $progressBar = $('<DIV />').addClass('gantt-chart-taskbar-progressbar');
                    var pbWidth = $taskbar.width() * (task.progress / 100);
                    var pbTop = $taskbar.height() - 3;
                    $taskbar.append($progressBar.css({ top: pbTop, width: pbWidth }));
                }
                
                // Add milestones
                for (var m = 0; m < task.milestones.length; ++m) {
                    var milestone = task.milestones[m];
                    var $milestone = $('<DIV />').addClass('gantt-chart-taskbar-milestone').attr('title', milestone.label);
                    var milestoneDate = new Date(milestone.milestonedate);                   

                    var mLeft = ((tempDate.dayDiff(taskStart, milestoneDate) / duration) * taskWidth - 2);
                    var mTop = $taskbar.height() - (_settings.milestoneHeight + 1);
                    $taskbar.append($milestone.css({ left: mLeft, top: mTop }));
                }
                
                $chart.append($taskbar);
            }
        }
    };
};

/* Quarterly drawer */
GanttDrawer.prototype.getQuarterlyDrawer = function () {
    var _self = this;
    var _settings = _self.gantt.settings;

    _self.createChartHeader = "Quarterly";
    _self.createChart = "<div class='gantt-chart-container'>Not implemented</div>";
};

/* Yearly drawer */
GanttDrawer.prototype.getYearlyDrawer = function () {
    var _self = this;
    var _settings = _self.gantt.settings;
    
    _self.createChartHeader = "Yearly";
    _self.createChart = "<div class='gantt-chart-container'>Not implemented</div>";
};

