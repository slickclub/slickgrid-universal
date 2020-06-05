import { Constants } from '../constants';
import {
  Column,
  CurrentSorter,
  Extension,
  GridOption,
  HeaderMenu,
  MenuCommandItem,
  MenuCommandItemCallbackArgs,
  Locale,
  SingleColumnSort,
  SlickEventHandler,
  SlickGrid,
} from '../interfaces/index';
import {
  EmitterType,
  ExtensionName,
} from '../enums/index';
import { getTranslationPrefix } from '../services/utilities';
import { FilterService } from '../services/filter.service';
import { SortService } from '../services/sort.service';
import { SharedService } from '../services/shared.service';
import { ExtensionUtility } from './extensionUtility';
import { TranslaterService } from '../services/translater.service';
import { PubSubService } from '../services/pubSub.service';

// using external non-typed js libraries
declare const Slick: any;

export class HeaderMenuExtension implements Extension {
  private _addon: any;
  private _eventHandler: SlickEventHandler;
  private _locales: Locale;

  constructor(
    private extensionUtility: ExtensionUtility,
    private filterService: FilterService,
    private pubSubService: PubSubService,
    private sharedService: SharedService,
    private sortService: SortService,
    private translaterService: TranslaterService,
  ) {
    this._eventHandler = new Slick.EventHandler();
  }

  get eventHandler(): SlickEventHandler {
    return this._eventHandler;
  }

  dispose() {
    // unsubscribe all SlickGrid events
    this._eventHandler.unsubscribeAll();

    if (this._addon && this._addon.destroy) {
      this._addon.destroy();
    }
  }

  /** Get the instance of the SlickGrid addon (control or plugin). */
  getAddonInstance() {
    return this._addon;
  }

  /** Register the 3rd party addon (plugin) */
  register(): any {
    if (this.sharedService.gridOptions && this.sharedService.gridOptions.enableTranslate && (!this.translaterService || !this.translaterService.translate)) {
      throw new Error('[Slickgrid-Universal] requires a Translate Service to be installed and configured when the grid option "enableTranslate" is enabled.');
    }

    if (this.sharedService && this.sharedService.grid && this.sharedService.gridOptions) {
      // get locales provided by user in main file or else use default English locales via the Constants
      this._locales = this.sharedService.gridOptions && this.sharedService.gridOptions.locales || Constants.locales;

      // dynamically import the SlickGrid plugin (addon) with RequireJS
      this.extensionUtility.loadExtensionDynamically(ExtensionName.headerMenu);

      this.sharedService.gridOptions.headerMenu = { ...this.getDefaultHeaderMenuOptions(), ...this.sharedService.gridOptions.headerMenu };
      if (this.sharedService.gridOptions.enableHeaderMenu) {
        this.sharedService.gridOptions.headerMenu = this.addHeaderMenuCustomCommands(this.sharedService.gridOptions, this.sharedService.columnDefinitions);
      }
      this._addon = new Slick.Plugins.HeaderMenu(this.sharedService.gridOptions.headerMenu);
      this.sharedService.grid.registerPlugin(this._addon);

      // hook all events
      if (this.sharedService.grid && this.sharedService.gridOptions.headerMenu) {
        if (this.sharedService.gridOptions.headerMenu.onExtensionRegistered) {
          this.sharedService.gridOptions.headerMenu.onExtensionRegistered(this._addon);
        }
        this._eventHandler.subscribe(this._addon.onCommand, (event: Event, args: MenuCommandItemCallbackArgs) => {
          this.executeHeaderMenuInternalCommands(event, args);
          if (this.sharedService.gridOptions.headerMenu && typeof this.sharedService.gridOptions.headerMenu.onCommand === 'function') {
            this.sharedService.gridOptions.headerMenu.onCommand(event, args);
          }
        });
        if (this.sharedService.gridOptions.headerMenu && typeof this.sharedService.gridOptions.headerMenu.onBeforeMenuShow === 'function') {
          this._eventHandler.subscribe(this._addon.onBeforeMenuShow, (event: Event, args: { grid: SlickGrid; column: Column; menu: any; }) => {
            if (this.sharedService.gridOptions.headerMenu && this.sharedService.gridOptions.headerMenu.onBeforeMenuShow) {
              this.sharedService.gridOptions.headerMenu.onBeforeMenuShow(event, args);
            }
          });
        }
        if (this.sharedService.gridOptions.headerMenu && typeof this.sharedService.gridOptions.headerMenu.onAfterMenuShow === 'function') {
          this._eventHandler.subscribe(this._addon.onAfterMenuShow, (event: Event, args: { grid: SlickGrid; column: Column; menu: any; }) => {
            if (this.sharedService.gridOptions.headerMenu && this.sharedService.gridOptions.headerMenu.onAfterMenuShow) {
              this.sharedService.gridOptions.headerMenu.onAfterMenuShow(event, args);
            }
          });
        }
      }
      return this._addon;
    }
    return null;
  }

  /**
   * Create Header Menu with Custom Commands if user has enabled Header Menu
   * @param options
   * @param columnDefinitions
   * @return header menu
   */
  private addHeaderMenuCustomCommands(options: GridOption, columnDefinitions: Column[]): HeaderMenu {
    const headerMenuOptions = options.headerMenu || {};
    const gridOptions = this.sharedService.gridOptions;
    const translationPrefix = getTranslationPrefix(gridOptions);

    if (columnDefinitions && Array.isArray(columnDefinitions) && options.enableHeaderMenu) {
      columnDefinitions.forEach((columnDef: Column) => {
        if (columnDef && !columnDef.excludeFromHeaderMenu) {
          if (!columnDef.header || !columnDef.header.menu) {
            columnDef.header = {
              menu: {
                items: []
              }
            };
          }
          const columnHeaderMenuItems: Array<MenuCommandItem | 'divider'> = columnDef && columnDef.header && columnDef.header.menu && columnDef.header.menu.items || [];

          // Sorting Commands
          if (options.enableSorting && columnDef.sortable && headerMenuOptions && !headerMenuOptions.hideSortCommands) {
            if (columnHeaderMenuItems.filter((item: MenuCommandItem) => item.hasOwnProperty('command') && item.command === 'sort-asc').length === 0) {
              columnHeaderMenuItems.push({
                iconCssClass: headerMenuOptions.iconSortAscCommand || 'fa fa-sort-asc',
                title: options.enableTranslate ? this.translaterService.translate(`${translationPrefix}SORT_ASCENDING`) : this._locales && this._locales.TEXT_SORT_ASCENDING,
                command: 'sort-asc',
                positionOrder: 50
              });
            }
            if (columnHeaderMenuItems.filter((item: MenuCommandItem) => item.hasOwnProperty('command') && item.command === 'sort-desc').length === 0) {
              columnHeaderMenuItems.push({
                iconCssClass: headerMenuOptions.iconSortDescCommand || 'fa fa-sort-desc',
                title: options.enableTranslate ? this.translaterService.translate(`${translationPrefix}SORT_DESCENDING`) : this._locales && this._locales.TEXT_SORT_DESCENDING,
                command: 'sort-desc',
                positionOrder: 51
              });
            }

            // add a divider (separator) between the top sort commands and the other clear commands
            if (columnHeaderMenuItems.filter((item: MenuCommandItem) => item.positionOrder === 52).length === 0) {
              columnHeaderMenuItems.push({ divider: true, command: '', positionOrder: 52 });
            }

            if (!headerMenuOptions.hideClearSortCommand && columnHeaderMenuItems.filter((item: MenuCommandItem) => item.hasOwnProperty('command') && item.command === 'clear-sort').length === 0) {
              columnHeaderMenuItems.push({
                iconCssClass: headerMenuOptions.iconClearSortCommand || 'fa fa-unsorted',
                title: options.enableTranslate ? this.translaterService.translate(`${translationPrefix}REMOVE_SORT`) : this._locales && this._locales.TEXT_REMOVE_SORT,
                command: 'clear-sort',
                positionOrder: 54
              });
            }
          }

          // Filtering Commands
          if (options.enableFiltering && columnDef.filterable && headerMenuOptions && !headerMenuOptions.hideFilterCommands) {
            if (!headerMenuOptions.hideClearFilterCommand && columnHeaderMenuItems.filter((item: MenuCommandItem) => item.hasOwnProperty('command') && item.command === 'clear-filter').length === 0) {
              columnHeaderMenuItems.push({
                iconCssClass: headerMenuOptions.iconClearFilterCommand || 'fa fa-filter',
                title: options.enableTranslate ? this.translaterService.translate(`${translationPrefix}REMOVE_FILTER`) : this._locales && this._locales.TEXT_REMOVE_FILTER,
                command: 'clear-filter',
                positionOrder: 53
              });
            }
          }

          // Hide Column Command
          if (headerMenuOptions && !headerMenuOptions.hideColumnHideCommand && columnHeaderMenuItems.filter((item: MenuCommandItem) => item.hasOwnProperty('command') && item.command === 'hide').length === 0) {
            columnHeaderMenuItems.push({
              iconCssClass: headerMenuOptions.iconColumnHideCommand || 'fa fa-times',
              title: options.enableTranslate ? this.translaterService.translate(`${translationPrefix}HIDE_COLUMN`) : this._locales && this._locales.TEXT_HIDE_COLUMN,
              command: 'hide',
              positionOrder: 55
            });
          }

          this.extensionUtility.translateItems(columnHeaderMenuItems, 'titleKey', 'title');
          this.extensionUtility.sortItems(columnHeaderMenuItems, 'positionOrder');
        }
      });

    }

    return headerMenuOptions;
  }

  /** Hide a column from the grid */
  hideColumn(column: Column) {
    if (this.sharedService.grid && this.sharedService.grid.getColumns && this.sharedService.grid.setColumns && this.sharedService.grid.getColumnIndex) {
      const columnIndex = this.sharedService.grid.getColumnIndex(column.id);
      const currentColumns = this.sharedService.grid.getColumns();
      const visibleColumns = this.extensionUtility.arrayRemoveItemByIndex<Column>(currentColumns, columnIndex);
      this.sharedService.visibleColumns = visibleColumns;
      this.sharedService.grid.setColumns(visibleColumns);
      this.pubSubService.publish('onHeaderMenuColumnsChanged', { columns: visibleColumns });
    }
  }

  /** Translate the Header Menu titles, we need to loop through all column definition to re-translate them */
  translateHeaderMenu() {
    if (this.sharedService.gridOptions && this.sharedService.gridOptions.headerMenu) {
      this.resetHeaderMenuTranslations(this.sharedService.visibleColumns);
    }
  }

  /**
   * @return default Header Menu options
   */
  private getDefaultHeaderMenuOptions(): HeaderMenu {
    return {
      autoAlignOffset: 12,
      minWidth: 140,
      hideColumnHideCommand: false,
      hideSortCommands: false,
      title: ''
    };
  }

  /**
   * Reset all the internal Menu options which have text to translate
   * @param header menu object
   */
  private resetHeaderMenuTranslations(columnDefinitions: Column[]) {
    const gridOptions = this.sharedService.gridOptions;
    const translationPrefix = getTranslationPrefix(gridOptions);

    columnDefinitions.forEach((columnDef: Column) => {
      if (columnDef && columnDef.header && columnDef.header.menu && columnDef.header.menu.items) {
        if (!columnDef.excludeFromHeaderMenu) {
          const columnHeaderMenuItems: Array<MenuCommandItem | 'divider'> = columnDef.header.menu.items || [];
          columnHeaderMenuItems.forEach((item: MenuCommandItem) => {
            if (item.hasOwnProperty('command')) {
              switch (item.command) {
                case 'clear-filter':
                  item.title = this.translaterService.translate(`${translationPrefix}REMOVE_FILTER`) || this._locales && this._locales.TEXT_REMOVE_FILTER;
                  break;
                case 'clear-sort':
                  item.title = this.translaterService.translate(`${translationPrefix}REMOVE_SORT`) || this._locales && this._locales.TEXT_REMOVE_SORT;
                  break;
                case 'sort-asc':
                  item.title = this.translaterService.translate(`${translationPrefix}SORT_ASCENDING`) || this._locales && this._locales.TEXT_SORT_ASCENDING;
                  break;
                case 'sort-desc':
                  item.title = this.translaterService.translate(`${translationPrefix}SORT_DESCENDING`) || this._locales && this._locales.TEXT_SORT_DESCENDING;
                  break;
                case 'hide':
                  item.title = this.translaterService.translate(`${translationPrefix}HIDE_COLUMN`) || this._locales && this._locales.TEXT_HIDE_COLUMN;
                  break;
              }
            }

            // re-translate if there's a "titleKey"
            if (this.sharedService.gridOptions && this.sharedService.gridOptions.enableTranslate) {
              this.extensionUtility.translateItems(columnHeaderMenuItems, 'titleKey', 'title');
            }
          });
        }
      }
    });
  }

  // --
  // private functions
  // ------------------

  /** Clear the Filter on the current column (if it's actually filtered) */
  private clearColumnFilter(event: Event, args: MenuCommandItemCallbackArgs) {
    if (args && args.column) {
      this.filterService.clearFilterByColumnId(event, args.column.id);
    }
  }

  /** Clear the Sort on the current column (if it's actually sorted) */
  private clearColumnSort(e: Event, args: MenuCommandItemCallbackArgs) {
    if (args && args.column && this.sharedService) {
      // get previously sorted columns
      const allSortedCols = this.sortService.getCurrentColumnSorts();
      const sortedColsWithoutCurrent = this.sortService.getCurrentColumnSorts(args.column.id + '');

      if (Array.isArray(allSortedCols) && Array.isArray(sortedColsWithoutCurrent) && allSortedCols.length !== sortedColsWithoutCurrent.length) {
        if (this.sharedService.gridOptions.backendServiceApi) {
          this.sortService.onBackendSortChanged(e, { multiColumnSort: true, sortCols: sortedColsWithoutCurrent, grid: this.sharedService.grid });
        } else if (this.sharedService.dataView) {
          this.sortService.onLocalSortChanged(this.sharedService.grid, this.sharedService.dataView, sortedColsWithoutCurrent, true);
        } else {
          // when using customDataView, we will simply send it as a onSort event with notify
          const isMultiSort = this.sharedService && this.sharedService.gridOptions && this.sharedService.gridOptions.multiColumnSort || false;
          const sortOutput = isMultiSort ? sortedColsWithoutCurrent : sortedColsWithoutCurrent[0];
          args.grid.onSort.notify(sortOutput);
        }

        // update the this.sharedService.gridObj sortColumns array which will at the same add the visual sort icon(s) on the UI
        const updatedSortColumns = sortedColsWithoutCurrent.map((col) => {
          return {
            columnId: col && col.sortCol && col.sortCol.id,
            sortAsc: col && col.sortAsc,
          };
        });
        this.sharedService.grid.setSortColumns(updatedSortColumns); // add sort icon in UI
      }
    }
  }

  /** Execute the Header Menu Commands that was triggered by the onCommand subscribe */
  private executeHeaderMenuInternalCommands(event: Event, args: MenuCommandItemCallbackArgs) {
    if (args && args.command) {
      switch (args.command) {
        case 'hide':
          this.hideColumn(args.column);
          if (this.sharedService.gridOptions && this.sharedService.gridOptions.enableAutoSizeColumns) {
            this.sharedService.grid.autosizeColumns();
          }
          break;
        case 'clear-filter':
          this.clearColumnFilter(event, args);
          break;
        case 'clear-sort':
          this.clearColumnSort(event, args);
          break;
        case 'sort-asc':
        case 'sort-desc':
          const isSortingAsc = (args.command === 'sort-asc');
          this.sortColumn(event, args, isSortingAsc);
          break;
        default:
          break;
      }
    }
  }

  /** Sort the current column */
  private sortColumn(event: Event, args: MenuCommandItemCallbackArgs, isSortingAsc = true) {
    if (args && args.column) {
      // get previously sorted columns
      const columnDef = args.column;
      const sortedColsWithoutCurrent = this.sortService.getCurrentColumnSorts(columnDef.id + '');

      let emitterType: EmitterType = EmitterType.local;

      // add to the column array, the column sorted by the header menu
      sortedColsWithoutCurrent.push({ columnId: columnDef.id, sortCol: columnDef, sortAsc: isSortingAsc });
      if (this.sharedService.gridOptions.backendServiceApi) {
        this.sortService.onBackendSortChanged(event, { multiColumnSort: true, sortCols: sortedColsWithoutCurrent, grid: this.sharedService.grid });
        emitterType = EmitterType.remote;
      } else if (this.sharedService.dataView) {
        this.sortService.onLocalSortChanged(this.sharedService.grid, this.sharedService.dataView, sortedColsWithoutCurrent);
        emitterType = EmitterType.local;
      } else {
        // when using customDataView, we will simply send it as a onSort event with notify
        const isMultiSort = this.sharedService && this.sharedService.gridOptions && this.sharedService.gridOptions.multiColumnSort || false;
        const sortOutput = isMultiSort ? sortedColsWithoutCurrent : sortedColsWithoutCurrent[0];
        args.grid.onSort.notify(sortOutput);
      }

      // update the this.sharedService.gridObj sortColumns array which will at the same add the visual sort icon(s) on the UI
      const newSortColumns = sortedColsWithoutCurrent.map((col) => {
        return {
          columnId: col && col.sortCol && col.sortCol.id,
          sortAsc: col && col.sortAsc,
        };
      });

      // add sort icon in UI
      this.sharedService.grid.setSortColumns(newSortColumns);

      // if we have an emitter type set, we will emit a sort changed
      // for the Grid State Service to see the change.
      // We also need to pass current sorters changed to the emitSortChanged method
      if (emitterType) {
        const currentLocalSorters: CurrentSorter[] = [];
        newSortColumns.forEach((sortCol) => {
          currentLocalSorters.push({
            columnId: sortCol.columnId + '',
            direction: sortCol.sortAsc ? 'ASC' : 'DESC'
          });
        });
        this.sortService.emitSortChanged(emitterType, currentLocalSorters);
      }
    }
  }
}
