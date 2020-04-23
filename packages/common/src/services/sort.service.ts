import {
  Aggregator,
  Column,
  ColumnSort,
  GridOption,
  CurrentSorter,
  SlickEventHandler,
  TreeDataOption,
} from '../interfaces/index';
import {
  EmitterType,
  FieldType,
  SortDirection,
  SortDirectionNumber,
  SortDirectionString,
} from '../enums/index';
import { executeBackendCallback, refreshBackendDataset } from './backend-utilities';
import { getDescendantProperty, convertHierarchicalViewToParentChildArray } from './utilities';
import { sortByFieldType } from '../sortComparers/sortUtilities';
import { PubSubService } from './pubSub.service';
import { SharedService } from './shared.service';

// using external non-typed js libraries
declare const Slick: any;

export class SortService {
  private _currentLocalSorters: CurrentSorter[] = [];
  private _eventHandler: SlickEventHandler;
  private _dataView: any;
  private _grid: any;
  private _groupTotals: any[] = [];
  private _isBackendGrid = false;

  constructor(private sharedService: SharedService, private pubSubService: PubSubService) {
    this._eventHandler = new Slick.EventHandler();
  }

  /** Getter of the SlickGrid Event Handler */
  get eventHandler(): SlickEventHandler {
    return this._eventHandler;
  }

  /** Getter for the Grid Options pulled through the Grid Object */
  private get _gridOptions(): GridOption {
    return (this._grid && this._grid.getOptions) ? this._grid.getOptions() : {};
  }

  /** Getter for the Column Definitions pulled through the Grid Object */
  private get _columnDefinitions(): Column[] {
    return (this._grid && this._grid.getColumns) ? this._grid.getColumns() : [];
  }

  /**
   * Bind a backend sort (single/multi) hook to the grid
   * @param grid SlickGrid Grid object
   * @param dataView SlickGrid DataView object
   */
  bindBackendOnSort(grid: any, dataView: any) {
    this._isBackendGrid = true;
    this._grid = grid;
    this._dataView = dataView;

    // subscribe to the SlickGrid event and call the backend execution
    this._eventHandler.subscribe(grid.onSort, this.onBackendSortChanged.bind(this));
  }

  /**
   * Bind a local sort (single/multi) hook to the grid
   * @param grid SlickGrid Grid object
   * @param gridOptions Grid Options object
   * @param dataView
   */
  bindLocalOnSort(grid: any, dataView: any) {
    this._isBackendGrid = false;
    this._grid = grid;
    this._dataView = dataView;

    this.processTreeDataInitialSort();

    this._eventHandler.subscribe(grid.onSort, (e: any, args: any) => {
      // multiSort and singleSort are not exactly the same, but we want to structure it the same for the (for loop) after
      // also to avoid having to rewrite the for loop in the sort, we will make the singleSort an array of 1 object
      const sortColumns = (args.multiColumnSort) ? args.sortCols : new Array({ sortAsc: args.sortAsc, sortCol: args.sortCol });

      // keep current sorters
      this._currentLocalSorters = []; // reset current local sorters
      if (Array.isArray(sortColumns)) {
        sortColumns.forEach((sortColumn: { sortCol: Column, sortAsc: number }) => {
          if (sortColumn.sortCol) {
            this._currentLocalSorters.push({
              columnId: sortColumn.sortCol.id,
              direction: sortColumn.sortAsc ? SortDirection.ASC : SortDirection.DESC
            });
          }
        });
      }

      this.onLocalSortChanged(grid, dataView, sortColumns);
      this.emitSortChanged(EmitterType.local);
    });
  }

  /**
   * Clear Sorting
   * - 1st, remove the SlickGrid sort icons (this setSortColumns function call really does only that)
   * - 2nd, we also need to trigger a sort change
   *   - for a backend grid, we will trigger a backend sort changed with an empty sort columns array
   *   - however for a local grid, we need to pass a sort column and so we will sort by the 1st column
   * @param trigger query event after executing clear filter?
   */
  clearSorting(triggerQueryEvent = true) {
    if (this._grid && this._gridOptions && this._dataView) {
      // remove any sort icons (this setSortColumns function call really does only that)
      this._grid.setSortColumns([]);

      // we also need to trigger a sort change
      // for a backend grid, we will trigger a backend sort changed with an empty sort columns array
      // however for a local grid, we need to pass a sort column and so we will sort by the 1st column
      if (triggerQueryEvent) {
        if (this._isBackendGrid) {
          this.onBackendSortChanged(undefined, { grid: this._grid, sortCols: [], clearSortTriggered: true });
        } else {
          if (this._columnDefinitions && Array.isArray(this._columnDefinitions) && this._columnDefinitions.length > 0) {
            const sortColFieldId = this._gridOptions && this._gridOptions.defaultColumnSortFieldId || 'id';
            const sortCol = { id: sortColFieldId, field: sortColFieldId } as Column;
            this.onLocalSortChanged(this._grid, this._dataView, new Array({ sortAsc: true, sortCol, clearSortTriggered: true }));
          }
        }
      } else if (this._isBackendGrid) {
        const backendService = this._gridOptions && this._gridOptions.backendServiceApi && this._gridOptions.backendServiceApi.service;
        if (backendService && backendService.clearSorters) {
          backendService.clearSorters();
        }
      }
    }

    // set current sorter to empty & emit a sort changed event
    this._currentLocalSorters = [];

    // emit an event when sorts are all cleared
    this.pubSubService.publish('onSortCleared', true);
  }

  /**
   * A simple function that will be called to emit a change when a sort changes.
   * Other services, like Pagination, can then subscribe to it.
   * @param sender
   */
  emitSortChanged(sender: EmitterType, currentLocalSorters?: CurrentSorter[]) {
    if (sender === EmitterType.remote && this._gridOptions && this._gridOptions.backendServiceApi) {
      let currentSorters: CurrentSorter[] = [];
      const backendService = this._gridOptions.backendServiceApi.service;
      if (backendService && backendService.getCurrentSorters) {
        currentSorters = backendService.getCurrentSorters() as CurrentSorter[];
      }
      this.pubSubService.publish('onSortChanged', currentSorters);
    } else if (sender === EmitterType.local) {
      if (currentLocalSorters) {
        this._currentLocalSorters = currentLocalSorters;
      }
      this.pubSubService.publish('onSortChanged', this.getCurrentLocalSorters());
    }
  }

  getCurrentLocalSorters(): CurrentSorter[] {
    return this._currentLocalSorters;
  }

  /**
   * Get current column sorts,
   * If a column is passed as an argument, that will be exclusion so we won't add this column to our output array since it is already in the array.
   * The usage of this method is that we want to know the sort prior to calling the next sorting command
   */
  getCurrentColumnSorts(excludedColumnId?: string) {
    // getSortColumns() only returns sortAsc & columnId, we want the entire column definition
    const oldSortColumns = this._grid && this._grid.getSortColumns();

    // get the column definition but only keep column which are not equal to our current column
    if (Array.isArray(oldSortColumns)) {
      const sortedCols = oldSortColumns.reduce((cols: ColumnSort[], col: ColumnSort) => {
        if (!excludedColumnId || col.columnId !== excludedColumnId) {
          cols.push({ sortCol: this._columnDefinitions[this._grid.getColumnIndex(col.columnId)], sortAsc: col.sortAsc });
        }
        return cols;
      }, []);

      return sortedCols;
    }
    return [];
  }

  /** Load defined Sorting (sorters) into the grid */
  loadGridSorters(sorters: CurrentSorter[]): ColumnSort[] {
    this._currentLocalSorters = []; // reset current local sorters
    const sortCols: ColumnSort[] = [];

    if (Array.isArray(sorters)) {
      sorters.forEach((sorter: CurrentSorter) => {
        const gridColumn = this._columnDefinitions.find((col: Column) => col.id === sorter.columnId);
        if (gridColumn) {
          sortCols.push({
            columnId: gridColumn.id,
            sortAsc: ((sorter.direction.toUpperCase() === SortDirection.ASC) ? true : false),
            sortCol: gridColumn
          });

          // keep current sorters
          this._currentLocalSorters.push({
            columnId: gridColumn.id + '',
            direction: sorter.direction.toUpperCase() as SortDirectionString
          });
        }
      });

      if (sortCols.length > 0) {
        this.onLocalSortChanged(this._grid, this._dataView, sortCols);
        this._grid.setSortColumns(sortCols); // use this to add sort icon(s) in UI
      }

    }
    return sortCols;
  }

  dispose() {
    // unsubscribe all SlickGrid events
    if (this._eventHandler && this._eventHandler.unsubscribeAll) {
      this._eventHandler.unsubscribeAll();
    }
  }

  /** Process the initial sort, typically it will sort ascending by the column that has the Tree Data unless user specifies a different initialSort */
  processTreeDataInitialSort() {
    // when a Tree Data view is defined, we must sort the data so that the UI works correctly
    if (this._gridOptions && this._gridOptions.enableTreeData && this._gridOptions.treeDataOptions) {
      // first presort it once by tree level
      const treeDataOptions = this._gridOptions.treeDataOptions;
      const columnWithTreeData = this._columnDefinitions.find((col: Column) => col && col.id === treeDataOptions.columnId);
      if (columnWithTreeData) {
        let sortDirection = SortDirection.ASC;
        let sortTreeLevelColumn: ColumnSort = { columnId: treeDataOptions.columnId, sortCol: columnWithTreeData, sortAsc: true };

        // user could provide a custom sort field id, if so get that column and sort by it
        if (treeDataOptions && treeDataOptions.initialSort && treeDataOptions.initialSort.columnId) {
          const initialSortColumnId = treeDataOptions.initialSort.columnId;
          const initialSortColumn = this._columnDefinitions.find((col: Column) => col.id === initialSortColumnId);
          sortDirection = (treeDataOptions.initialSort.direction || SortDirection.ASC).toUpperCase() as SortDirection;
          sortTreeLevelColumn = { columnId: initialSortColumnId, sortCol: initialSortColumn, sortAsc: (sortDirection === SortDirection.ASC) } as ColumnSort;
        }

        // when we have a valid column with Tree Data, we can sort by that column
        if (sortTreeLevelColumn && sortTreeLevelColumn.columnId) {
          this.updateSorting([{ columnId: sortTreeLevelColumn.columnId || '', direction: sortDirection }]);
        }
      }
    }
  }

  onBackendSortChanged(event: Event | undefined, args: { multiColumnSort?: boolean; grid: any; sortCols: ColumnSort[]; clearSortTriggered?: boolean }) {
    if (!args || !args.grid) {
      throw new Error('Something went wrong when trying to bind the "onBackendSortChanged(event, args)" function, it seems that "args" is not populated correctly');
    }
    const gridOptions: GridOption = (args.grid && args.grid.getOptions) ? args.grid.getOptions() : {};
    const backendApi = gridOptions.backendServiceApi;

    if (!backendApi || !backendApi.process || !backendApi.service) {
      throw new Error(`BackendServiceApi requires at least a "process" function and a "service" defined`);
    }

    // keep start time & end timestamps & return it after process execution
    const startTime = new Date();

    if (backendApi.preProcess) {
      backendApi.preProcess();
    }

    // query backend
    const query = backendApi.service.processOnSortChanged(event, args);
    const totalItems = gridOptions && gridOptions.pagination && gridOptions.pagination.totalItems || 0;
    executeBackendCallback(backendApi, query, args, startTime, totalItems, this.emitSortChanged.bind(this));
  }

  /** When a Sort Changes on a Local grid (JSON dataset) */
  onLocalSortChanged(grid: any, dataView: any, sortColumns: ColumnSort[], forceReSort = false) {
    const isTreeDataEnabled = this._gridOptions && this._gridOptions.enableTreeData || false;

    if (grid && dataView) {
      if (forceReSort && !isTreeDataEnabled) {
        dataView.reSort();
      }

      if (isTreeDataEnabled && Array.isArray(this.sharedService.hierarchicalDataset)) {
        const hierarchicalDataset = this.sharedService.hierarchicalDataset;
        this.sortTreeData(hierarchicalDataset, sortColumns);
        const dataViewIdIdentifier = this._gridOptions?.datasetIdPropertyName ?? 'id';
        const treeDataOpt: TreeDataOption = this._gridOptions?.treeDataOptions ?? { columnId: '' };
        const treeDataOptions = { ...treeDataOpt, identifierPropName: treeDataOpt.identifierPropName || dataViewIdIdentifier };
        const sortedFlatArray = convertHierarchicalViewToParentChildArray(hierarchicalDataset, treeDataOptions);
        dataView.setItems(sortedFlatArray, this._gridOptions?.datasetIdPropertyName ?? 'id');
      } else {
        dataView.sort(this.sortComparers.bind(this, sortColumns));
      }

      grid.invalidate();
    }
  }

  sortComparers(sortColumns: ColumnSort[], dataRow1: any, dataRow2: any): number {
    if (Array.isArray(sortColumns)) {
      for (const sortColumn of sortColumns) {
        const result = this.sortComparer(sortColumn, dataRow1, dataRow2);
        if (result !== undefined) {
          return result;
        }
      }
    }
    return SortDirectionNumber.neutral;
  }

  sortComparer(sortColumn: ColumnSort, dataRow1: any, dataRow2: any, querySortField?: string): number | undefined {
    if (sortColumn && sortColumn.sortCol) {
      const columnDef = sortColumn.sortCol;
      const sortDirection = sortColumn.sortAsc ? SortDirectionNumber.asc : SortDirectionNumber.desc;
      let queryFieldName1 = querySortField || columnDef.queryFieldSorter || columnDef.queryField || columnDef.field;
      let queryFieldName2 = queryFieldName1;
      const fieldType = columnDef.type || FieldType.string;

      // if user provided a query field name getter callback, we need to get the name on each item independently
      if (typeof columnDef.queryFieldNameGetterFn === 'function') {
        queryFieldName1 = columnDef.queryFieldNameGetterFn(dataRow1);
        queryFieldName2 = columnDef.queryFieldNameGetterFn(dataRow2);
      }

      let value1 = dataRow1[queryFieldName1];
      let value2 = dataRow2[queryFieldName2];

      // when item is a complex object (dot "." notation), we need to filter the value contained in the object tree
      if (queryFieldName1 && queryFieldName1.indexOf('.') >= 0) {
        value1 = getDescendantProperty(dataRow1, queryFieldName1);
      }
      if (queryFieldName2 && queryFieldName2.indexOf('.') >= 0) {
        value2 = getDescendantProperty(dataRow2, queryFieldName2);
      }

      // user could provide his own custom Sorter
      if (columnDef.sortComparer) {
        const customSortResult = columnDef.sortComparer(value1, value2, sortDirection, columnDef);
        if (customSortResult !== SortDirectionNumber.neutral) {
          return customSortResult;
        }
      } else {
        const sortResult = sortByFieldType(fieldType, value1, value2, sortDirection, columnDef);
        if (sortResult !== SortDirectionNumber.neutral) {
          return sortResult;
        }
      }
    }
    return undefined;
  }

  sortTreeData(hierarchicalArray: any[], sortColumns: ColumnSort[]) {
    const aggregators = this._gridOptions?.treeDataOptions?.aggregators;
    if (Array.isArray(sortColumns)) {
      for (const sortColumn of sortColumns) {
        const totals = this.sortTreeChild(hierarchicalArray, sortColumn, 0, aggregators, {});
        // console.log(totals);
      }
      // console.log(hierarchicalArray, this._groupTotals);
    }
  }

  /** Sort the Tree Children of a hierarchical dataset by recursion */
  sortTreeChild(hierarchicalArray: any[], sortColumn: ColumnSort, treeLevel: number, aggregators: Aggregator[] | undefined, groupTotal: any) {
    const treeDataOptions = this._gridOptions?.treeDataOptions;
    const treeColumnId = treeDataOptions?.columnId || '';
    const childrenPropName = treeDataOptions?.childrenPropName || 'children';
    hierarchicalArray.sort((a: any, b: any) => this.sortComparer(sortColumn, a, b) ?? SortDirectionNumber.neutral);
    let previousLevel = -1;

    // when item has a child, we'll sort recursively
    for (const item of hierarchicalArray) {
      if (item) {
        const hasChildren = item.hasOwnProperty(childrenPropName) && Array.isArray(item[childrenPropName]);
        // let groupTotal;
        // when item has a child, we'll sort recursively
        if (hasChildren) {
          let gt = null;
          // if we also have aggregators defined, we'll create and initialize a group total
          if (Array.isArray(aggregators)) {
            gt = new Slick.GroupTotals();
            gt.group = item[treeColumnId];
            gt.level = treeLevel;
            gt.initialized = true;
            aggregators.forEach((aggregator) => aggregator && aggregator.init()); // reset aggregator(s)
            item.__treeGroupTotal = gt;
            // totals.push(groupTotal);
          }
          treeLevel++;
          this.sortTreeChild(item[childrenPropName], sortColumn, treeLevel, aggregators, gt);
          treeLevel--;
        }

        // when it's a regular item and we have Aggregator(s), we'll execute each of them
        // it will also take these aggregation result(s) and update each item field(s) with the new result
        if (Array.isArray(aggregators)) {
          for (const aggregator of aggregators) {
            if (aggregator && aggregator.accumulate && aggregator.storeResult) {
              // console.log(groupTotal, item)
              aggregator.accumulate(item);
              aggregator.storeResult(groupTotal);
              if (hasChildren && aggregator.type && aggregator.field && groupTotal[aggregator.type] && groupTotal[aggregator.type].hasOwnProperty(aggregator.field)) {
                console.log(treeLevel, groupTotal.level, previousLevel, groupTotal, item[aggregator.field], groupTotal.sum && groupTotal.sum.size, hasChildren)
                // console.log(item[aggregator.field], groupTotal[aggregator.type][aggregator.field])
                item[aggregator.field] = groupTotal[aggregator.type][aggregator.field];
                item.__treeGroupTotal[aggregator.type] = groupTotal[aggregator.type][aggregator.field];
              }
              if (item.__treeGroupTotal) {
                this._groupTotals.push(item.__treeGroupTotal);
              }
            }
          }
          previousLevel = groupTotal.level;
        }
      }
    }
    return groupTotal;
  }

  /**
   * Update Sorting (sorters) dynamically just by providing an array of sorter(s).
   * You can also choose emit (default) a Sort Changed event that will be picked by the Grid State Service.
   *
   * Also for backend service only, you can choose to trigger a backend query (default) or not if you wish to do it later,
   * this could be useful when using updateFilters & updateSorting and you wish to only send the backend query once.
   * @param sorters array
   * @param triggerEvent defaults to True, do we want to emit a sort changed event?
   * @param triggerBackendQuery defaults to True, which will query the backend.
   */
  updateSorting(sorters: CurrentSorter[], emitChangedEvent = true, triggerBackendQuery = true) {
    if (!this._gridOptions || !this._gridOptions.enableSorting) {
      throw new Error('[Slickgrid-Universal] in order to use "updateSorting" method, you need to have Sortable Columns defined in your grid and "enableSorting" set in your Grid Options');
    }

    if (Array.isArray(sorters)) {
      const backendApi = this._gridOptions && this._gridOptions.backendServiceApi;

      if (backendApi) {
        const backendApiService = backendApi && backendApi.service;
        if (backendApiService && backendApiService.updateSorters) {
          backendApiService.updateSorters(undefined, sorters);
          if (triggerBackendQuery) {
            refreshBackendDataset(this._gridOptions);
          }
        }
      } else {
        this.loadGridSorters(sorters);
      }

      if (emitChangedEvent) {
        const emitterType = backendApi ? EmitterType.remote : EmitterType.local;
        this.emitSortChanged(emitterType);
      }
    }
  }
}
