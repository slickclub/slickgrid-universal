import {
  Aggregators,
  Column,
  Editors,
  FieldType,
  Filters,
  Formatters,
  GridOption,
  Grouping,
  GroupingGetterFunction,
  GroupTotalFormatters,
  SlickDataView,
  SlickDraggableGrouping,
  SlickGrid,
  SlickNamespace,
  SortComparers,
  SortDirectionNumber,
} from '@slickgrid-universal/common';
import { ExcelExportService } from '@slickgrid-universal/excel-export';
import { Slicker, SlickerGridInstance, SlickVanillaGridBundle } from '@slickgrid-universal/vanilla-bundle';

import { ExampleGridOptions } from './example-grid-options';
import '../salesforce-styles.scss';
import './example03.scss';

// using external SlickGrid JS libraries
declare const Slick: SlickNamespace;

interface ReportItem {
  title: string;
  duration: number;
  cost: number;
  percentComplete: number;
  start: Date;
  finish: Date;
  effortDriven: boolean;
}

export class Example3 {
  columnDefinitions: Column<ReportItem>[];
  gridOptions: GridOption;
  dataset: any[];
  dataViewObj: SlickDataView;
  gridObj: SlickGrid;
  editCommandQueue = [];
  sgb: SlickVanillaGridBundle;
  slickerGridInstance: SlickerGridInstance;
  durationOrderByCount = false;
  draggableGroupingPlugin: SlickDraggableGrouping;
  selectedGroupingFields: Array<string | GroupingGetterFunction> = ['', '', ''];

  attached() {
    this.initializeGrid();
    this.dataset = this.loadData(500);
    const gridContainerElm = document.querySelector<HTMLDivElement>(`.grid3`);

    gridContainerElm.addEventListener('onclick', this.handleOnClick.bind(this));
    gridContainerElm.addEventListener('oncellchange', this.handleOnCellChange.bind(this));
    gridContainerElm.addEventListener('onvalidationerror', this.handleValidationError.bind(this));
    gridContainerElm.addEventListener('onitemdeleted', this.handleItemDeleted.bind(this));
    gridContainerElm.addEventListener('onslickergridcreated', this.handleOnSlickerGridCreated.bind(this));
    this.sgb = new Slicker.GridBundle(gridContainerElm, this.columnDefinitions, { ...ExampleGridOptions, ...this.gridOptions }, this.dataset);
  }

  dispose() {
    this.sgb?.dispose();
  }

  initializeGrid() {
    this.columnDefinitions = [
      {
        id: 'title', name: 'Title', field: 'title', sortable: true, type: FieldType.string,
        editor: {
          model: Editors.longText,
          required: true,
          alwaysSaveOnEnterKey: true,
          minLength: 5,
          maxLength: 255,
        },
        filterable: true,
        grouping: {
          getter: 'title',
          formatter: (g) => `Title: ${g.value} <span style="color:green">(${g.count} items)</span>`,
          aggregators: [new Aggregators.Sum('cost')],
          aggregateCollapsed: false,
          collapsed: false
        }
      },
      {
        id: 'duration', name: 'Duration', field: 'duration', sortable: true, filterable: true,
        editor: {
          model: Editors.float,
          // required: true,
          decimal: 2,
          valueStep: 1,
          maxValue: 10000,
          alwaysSaveOnEnterKey: true,
        },
        type: FieldType.number,
        groupTotalsFormatter: GroupTotalFormatters.sumTotals,
        grouping: {
          getter: 'duration',
          formatter: (g) => `Duration: ${g.value} <span style="color:green">(${g.count} items)</span>`,
          comparer: (a, b) => {
            return this.durationOrderByCount ? (a.count - b.count) : SortComparers.numeric(a.value, b.value, SortDirectionNumber.asc);
          },
          aggregators: [new Aggregators.Sum('cost')],
          aggregateCollapsed: false,
          collapsed: false
        }
      },
      {
        id: 'cost', name: 'Cost', field: 'cost',
        width: 90,
        sortable: true,
        filterable: true,
        // filter: { model: Filters.compoundInput },
        // formatter: Formatters.dollar,
        formatter: Formatters.dollar,
        groupTotalsFormatter: GroupTotalFormatters.sumTotalsDollar,
        type: FieldType.number,
        grouping: {
          getter: 'cost',
          formatter: (g) => `Cost: ${g.value} <span style="color:green">(${g.count} items)</span>`,
          aggregators: [
            new Aggregators.Sum('cost')
          ],
          aggregateCollapsed: true,
          collapsed: true
        }
      },
      {
        id: 'percentComplete', name: '% Complete', field: 'percentComplete', type: FieldType.number,
        editor: {
          model: Editors.slider,
          minValue: 0,
          maxValue: 100,
          // params: { hideSliderNumber: true },
        },
        sortable: true, filterable: true,
        filter: { model: Filters.slider, operator: '>=' },
        groupTotalsFormatter: GroupTotalFormatters.avgTotalsPercentage,
        grouping: {
          getter: 'percentComplete',
          formatter: (g) => `% Complete:  ${g.value} <span style="color:green">(${g.count} items)</span>`,
          aggregators: [
            new Aggregators.Sum('cost')
          ],
          aggregateCollapsed: false,
          collapsed: false
        },
        params: { groupFormatterPrefix: '<i>Avg</i>: ' },
      },
      {
        id: 'start', name: 'Start', field: 'start', sortable: true,
        // formatter: Formatters.dateIso,
        type: FieldType.date, outputType: FieldType.dateIso,
        filterable: true, filter: { model: Filters.compoundDate },
        formatter: Formatters.dateIso,
        editor: { model: Editors.date },
        grouping: {
          getter: 'start',
          formatter: (g) => `Start: ${g.value} <span style="color:green">(${g.count} items)</span>`,
          aggregators: [
            new Aggregators.Sum('cost')
          ],
          aggregateCollapsed: false,
          collapsed: false
        }
      },
      {
        id: 'finish', name: 'Finish', field: 'finish', sortable: true,
        editor: { model: Editors.date, editorOptions: { minDate: 'today' }, },
        // formatter: Formatters.dateIso,
        type: FieldType.date, outputType: FieldType.dateIso,
        formatter: Formatters.dateIso,
        filterable: true, filter: { model: Filters.compoundDate },
        grouping: {
          getter: 'finish',
          formatter: (g) => `Finish: ${g.value} <span style="color:green">(${g.count} items)</span>`,
          aggregators: [
            new Aggregators.Sum('cost')
          ],
          aggregateCollapsed: false,
          collapsed: false
        }
      },
      {
        id: 'effortDriven', name: 'Effort Driven', field: 'effortDriven',
        width: 80, minWidth: 20, maxWidth: 100,
        cssClass: 'cell-effort-driven',
        sortable: true,
        filterable: true,
        filter: {
          collection: [{ value: '', label: '' }, { value: true, label: 'True' }, { value: false, label: 'False' }],
          model: Filters.singleSelect
        },
        exportWithFormatter: false,
        formatter: Formatters.checkmarkMaterial,
        grouping: {
          getter: 'effortDriven',
          formatter: (g) => `Effort-Driven: ${g.value ? 'True' : 'False'} <span style="color:green">(${g.count} items)</span>`,
          aggregators: [
            new Aggregators.Sum('cost')
          ],
          collapsed: false
        }
      },
      {
        id: 'action', name: 'Action', field: 'action', width: 100, maxWidth: 100,
        excludeFromExport: true,
        formatter: () => {
          return `<div class="fake-hyperlink">Action <span class="font-12px">&#9660;</span></div>`;
        },
        cellMenu: {
          hideCloseButton: false,
          width: 200,
          // you can override the logic of when the menu is usable
          // for example say that we want to show a menu only when then Priority is set to 'High'.
          // Note that this ONLY overrides the usability itself NOT the text displayed in the cell,
          // if you wish to change the cell text (or hide it)
          // then you SHOULD use it in combination with a custom formatter (actionFormatter) and use the same logic in that formatter
          // menuUsabilityOverride: (args) => {
          //   return (args.dataContext.priority === 3); // option 3 is High
          // },

          commandTitle: 'Commands',
          commandItems: [
            // array of command item objects, you can also use the "positionOrder" that will be used to sort the items in the list
            {
              command: 'command2', title: 'Command 2', positionOrder: 62,
              // you can use the "action" callback and/or use "onCallback" callback from the grid options, they both have the same arguments
              action: (e, args) => {
                console.log(args.dataContext, args.column);
                // action callback.. do something
              },
              // only enable command when the task is not completed
              itemUsabilityOverride: (args) => {
                return !args.dataContext.completed;
              }
            },
            { command: 'command1', title: 'Command 1', cssClass: 'orange', positionOrder: 61 },
            {
              command: 'delete-row', title: 'Delete Row', positionOrder: 64,
              iconCssClass: 'mdi mdi-close', cssClass: 'red', textCssClass: 'bold',
              // only show command to 'Delete Row' when the task is not completed
              itemVisibilityOverride: (args) => {
                return !args.dataContext.completed;
              }
            },
            // you can pass divider as a string or an object with a boolean (if sorting by position, then use the object)
            // note you should use the "divider" string only when items array is already sorted and positionOrder are not specified
            { divider: true, command: '', positionOrder: 63 },
            // 'divider',

            {
              command: 'help',
              title: 'Help',
              iconCssClass: 'mdi mdi-help-circle-outline',
              positionOrder: 66,
            },
            { command: 'something', title: 'Disabled Command', disabled: true, positionOrder: 67, }
          ],
          optionTitle: 'Change Complete Flag',
          optionItems: [
            { option: true, title: 'True', iconCssClass: 'mdi mdi-check-box-outline' },
            { option: false, title: 'False', iconCssClass: 'mdi mdi-checkbox-blank-outline' },
          ]
        }
      },
    ];

    this.gridOptions = {
      autoEdit: true, // true single click (false for double-click)
      autoCommitEdit: true,
      editable: true,
      autoResize: {
        container: '.demo-container',
      },
      enableAutoSizeColumns: true,
      enableAutoResize: true,
      enableCellNavigation: true,
      enableExcelExport: true,
      excelExportOptions: {
        exportWithFormatter: true
      },
      registerExternalServices: [new ExcelExportService()],
      enableFiltering: true,
      rowSelectionOptions: {
        // True (Single Selection), False (Multiple Selections)
        selectActiveRow: false
      },
      createPreHeaderPanel: true,
      showPreHeaderPanel: true,
      preHeaderPanelHeight: 35,
      rowHeight: 33,
      headerRowHeight: 35,
      enableDraggableGrouping: true,
      draggableGrouping: {
        dropPlaceHolderText: 'Drop a column header here to group by the column',
        // groupIconCssClass: 'fa fa-outdent',
        deleteIconCssClass: 'mdi mdi-close color-danger',
        onGroupChanged: (e, args) => this.onGroupChanged(args),
        onExtensionRegistered: (extension) => this.draggableGroupingPlugin = extension,
      },
      enableCheckboxSelector: true,
      enableRowSelection: true,
      checkboxSelector: {
        hideInFilterHeaderRow: false,
        hideInColumnTitleRow: true,
      },
      editCommandHandler: (item, column, editCommand) => {
        this.editCommandQueue.push(editCommand);
        editCommand.execute();
      },
      // when using the cellMenu, you can change some of the default options and all use some of the callback methods
      enableCellMenu: true,
      cellMenu: {
        // all the Cell Menu callback methods (except the action callback)
        // are available under the grid options as shown below
        onCommand: (e, args) => this.executeCommand(e, args),
        onOptionSelected: (e, args) => {
          // change "Completed" property with new option selected from the Cell Menu
          const dataContext = args && args.dataContext;
          if (dataContext && dataContext.hasOwnProperty('completed')) {
            dataContext.completed = args.item.option;
            this.sgb.gridService.updateItem(dataContext);
          }
        },
      },
    };
  }

  loadData(count: number) {
    // mock data
    const tmpArray = [];
    for (let i = 0; i < count; i++) {
      const randomYear = 2000 + Math.floor(Math.random() * 10);
      const randomFinishYear = (new Date().getFullYear() - 3) + Math.floor(Math.random() * 10); // use only years not lower than 3 years ago
      const randomMonth = Math.floor(Math.random() * 11);
      const randomDay = Math.floor((Math.random() * 29));
      const randomFinish = new Date(randomFinishYear, (randomMonth + 1), randomDay);

      tmpArray[i] = {
        id: i,
        title: 'Task ' + i,
        duration: Math.round(Math.random() * 100) + '',
        percentComplete: Math.round(Math.random() * 100),
        start: new Date(randomYear, randomMonth, randomDay),
        finish: randomFinish < new Date() ? '' : randomFinish, // make sure the random date is earlier than today
        cost: (i % 33 === 0) ? null : Math.round(Math.random() * 10000) / 100,
        effortDriven: (i % 5 === 0)
      };

      // if (i % 8) {
      //   delete tmpArray[i].duration; // test with undefined properties
      // }
    }
    if (this.sgb) {
      this.sgb.dataset = tmpArray;
    }
    return tmpArray;
  }

  clearGroupsAndSelects() {
    this.clearGroupingSelects();
    this.clearGrouping();
  }

  clearGroupingSelects() {
    this.selectedGroupingFields.forEach((g, i) => this.selectedGroupingFields[i] = '');
    this.selectedGroupingFields = [...this.selectedGroupingFields]; // force dirty checking
  }

  clearGrouping() {
    if (this.draggableGroupingPlugin && this.draggableGroupingPlugin.setDroppedGroups) {
      this.draggableGroupingPlugin.clearDroppedGroups();
    }
    this.gridObj.invalidate(); // invalidate all rows and re-render
  }

  collapseAllGroups() {
    this.dataViewObj.collapseAllGroups();
  }

  expandAllGroups() {
    this.dataViewObj.expandAllGroups();
  }

  groupByDuration() {
    this.clearGrouping();
    if (this.draggableGroupingPlugin && this.draggableGroupingPlugin.setDroppedGroups) {
      this.showPreHeader();
      this.draggableGroupingPlugin.setDroppedGroups('duration');
      this.gridObj.invalidate(); // invalidate all rows and re-render
    }
  }

  groupByDurationOrderByCount(sortedByCount = false) {
    this.durationOrderByCount = sortedByCount;
    this.clearGrouping();
    this.groupByDuration();

    // you need to manually add the sort icon(s) in UI
    const sortColumns = sortedByCount ? [] : [{ columnId: 'duration', sortAsc: true }];
    this.gridObj.setSortColumns(sortColumns);
    this.gridObj.invalidate(); // invalidate all rows and re-render
  }

  groupByDurationEffortDriven() {
    this.clearGrouping();
    if (this.draggableGroupingPlugin && this.draggableGroupingPlugin.setDroppedGroups) {
      this.showPreHeader();
      this.draggableGroupingPlugin.setDroppedGroups(['duration', 'effortDriven']);
      this.gridObj.invalidate(); // invalidate all rows and re-render

      // you need to manually add the sort icon(s) in UI
      const sortColumns = [{ columnId: 'duration', sortAsc: true }];
      this.gridObj.setSortColumns(sortColumns);
    }
  }

  groupByFieldName(fieldName, index) {
    this.clearGrouping();
    if (this.draggableGroupingPlugin && this.draggableGroupingPlugin.setDroppedGroups) {
      this.showPreHeader();

      // get the field names from Group By select(s) dropdown, but filter out any empty fields
      const groupedFields = this.selectedGroupingFields.filter((g) => g !== '');
      if (groupedFields.length === 0) {
        this.clearGrouping();
      } else {
        this.draggableGroupingPlugin.setDroppedGroups(groupedFields);
      }
      this.gridObj.invalidate(); // invalidate all rows and re-render
    }
  }

  showPreHeader() {
    this.gridObj.setPreHeaderPanelVisibility(true);
  }

  toggleDraggableGroupingRow() {
    this.clearGroupsAndSelects();
    this.gridObj.setPreHeaderPanelVisibility(!this.gridObj.getOptions().showPreHeaderPanel);
  }

  onGroupChanged(change: { caller?: string; groupColumns: Grouping[] }) {
    const caller = change && change.caller || [];
    const groups = change && change.groupColumns || [];

    if (Array.isArray(this.selectedGroupingFields) && Array.isArray(groups) && groups.length > 0) {
      // update all Group By select dropdown
      this.selectedGroupingFields.forEach((g, i) => this.selectedGroupingFields[i] = groups[i] && groups[i].getter || '');
      this.selectedGroupingFields = [...this.selectedGroupingFields]; // force dirty checking
    } else if (groups.length === 0 && caller === 'remove-group') {
      this.clearGroupingSelects();
    }
  }

  handleOnClick(event) {
    console.log('onClick', event.detail);
  }

  handleOnCellChange(event) {
    console.log('onCellChanged', event.detail);
  }

  handleValidationError(event) {
    console.log('handleValidationError', event.detail);
    const args = event.detail && event.detail.args;
    if (args.validationResults) {
      alert(args.validationResults.msg);
    }
  }

  handleItemDeleted(event) {
    const itemId = event && event.detail;
    console.log('item deleted with id:', itemId);
  }

  handleOnSlickerGridCreated(event) {
    this.slickerGridInstance = event && event.detail;
    this.gridObj = this.slickerGridInstance && this.slickerGridInstance.slickGrid;
    this.dataViewObj = this.slickerGridInstance && this.slickerGridInstance.dataView;
    console.log('handleOnSlickerGridCreated', this.slickerGridInstance);
  }

  executeCommand(e, args) {
    const columnDef = args.column;
    const command = args.command;
    const dataContext = args.dataContext;

    switch (command) {
      case 'command1':
        alert('Command 1');
        break;
      case 'command2':
        alert('Command 2');
        break;
      case 'help':
        alert('Please help!');
        break;
      case 'delete-row':
        if (confirm(`Do you really want to delete row (${args.row + 1}) with "${dataContext.title}"`)) {
          this.slickerGridInstance.gridService.deleteItemById(dataContext.id);
        }
        break;
    }
  }

  undo() {
    const command = this.editCommandQueue.pop();
    if (command && Slick.GlobalEditorLock.cancelCurrentEdit()) {
      command.undo();
      this.gridObj.gotoCell(command.row, command.cell, false);
    }
  }
}
