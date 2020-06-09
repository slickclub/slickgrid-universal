import { Constants } from '../constants';
import { ExtensionName } from '../enums/extensionName.enum';
import {
  CellMenuOption,
  Column,
  Extension,
  GetSlickEventType,
  MenuCommandItem,
  MenuOptionItem,
  Locale,
  SlickCellMenu,
  SlickEventHandler,
  SlickNamespace,
} from '../interfaces/index';
import { ExtensionUtility } from './extensionUtility';
import { SharedService } from '../services/shared.service';
import { TranslaterService } from '../services';

// using external non-typed js libraries
declare const Slick: SlickNamespace;

export class CellMenuExtension implements Extension {
  private _addon: SlickCellMenu | null;
  private _eventHandler: SlickEventHandler;
  private _locales: Locale;

  constructor(
    private extensionUtility: ExtensionUtility,
    private sharedService: SharedService,
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
  getAddonInstance(): SlickCellMenu | null {
    return this._addon;
  }

  /** Register the 3rd party addon (plugin) */
  register(): SlickCellMenu | null {
    if (this.sharedService.gridOptions && this.sharedService.gridOptions.enableTranslate && (!this.translaterService || !this.translaterService.translate)) {
      throw new Error('[Slickgrid-Universal] requires a Translate Service to be installed and configured when the grid option "enableTranslate" is enabled.');
    }

    if (this.sharedService && this.sharedService.grid && this.sharedService.gridOptions) {
      const cellMenu = this.sharedService.gridOptions.cellMenu;
      // get locales provided by user in main file or else use default English locales via the Constants
      this._locales = this.sharedService.gridOptions && this.sharedService.gridOptions.locales || Constants.locales;

      // dynamically import the SlickGrid plugin (addon) with RequireJS
      this.extensionUtility.loadExtensionDynamically(ExtensionName.cellMenu);
      this.sharedService.gridOptions.cellMenu = { ...this.getDefaultCellMenuOptions(), ...this.sharedService.gridOptions.cellMenu };

      // translate the item keys when necessary
      if (this.sharedService.gridOptions.enableTranslate) {
        this.translateCellMenu();
      }

      // sort all menu items by their position order when defined
      this.sortMenuItems(this.sharedService.allColumns);

      this._addon = new Slick.Plugins.CellMenu(this.sharedService.gridOptions.cellMenu);
      this.sharedService.grid.registerPlugin(this._addon);

      // hook all events
      if (this.sharedService.grid && this.sharedService.gridOptions.cellMenu) {
        if (this.sharedService.gridOptions.cellMenu.onExtensionRegistered) {
          this.sharedService.gridOptions.cellMenu.onExtensionRegistered(this._addon);
        }
        if (cellMenu && typeof cellMenu.onCommand === 'function') {
          const onCommand = this._addon.onCommand;
          (this._eventHandler as SlickEventHandler<GetSlickEventType<typeof onCommand>>).subscribe(onCommand, (event, args) => {
            if (cellMenu.onCommand) {
              cellMenu.onCommand(event, args);
            }
          });
        }
        if (cellMenu && typeof cellMenu.onOptionSelected === 'function') {
          const onOptionSelected = this._addon.onOptionSelected;
          (this._eventHandler as SlickEventHandler<GetSlickEventType<typeof onOptionSelected>>).subscribe(onOptionSelected, (event, args) => {
            if (cellMenu.onOptionSelected) {
              cellMenu.onOptionSelected(event, args);
            }
          });
        }
        if (cellMenu && typeof cellMenu.onBeforeMenuShow === 'function') {
          const onBeforeMenuShow = this._addon.onBeforeMenuShow;
          (this._eventHandler as SlickEventHandler<GetSlickEventType<typeof onBeforeMenuShow>>).subscribe(onBeforeMenuShow, (event, args) => {
            if (cellMenu.onBeforeMenuShow) {
              cellMenu.onBeforeMenuShow(event, args);
            }
          });
        }
        if (cellMenu && typeof cellMenu.onBeforeMenuClose === 'function') {
          const onBeforeMenuClose = this._addon.onBeforeMenuClose;
          (this._eventHandler as SlickEventHandler<GetSlickEventType<typeof onBeforeMenuClose>>).subscribe(onBeforeMenuClose, (event, args) => {
            if (cellMenu.onBeforeMenuClose) {
              cellMenu.onBeforeMenuClose(event, args);
            }
          });
        }
        if (cellMenu && typeof cellMenu.onAfterMenuShow === 'function') {
          const onAfterMenuShow = this._addon.onAfterMenuShow;
          (this._eventHandler as SlickEventHandler<GetSlickEventType<typeof onAfterMenuShow>>).subscribe(onAfterMenuShow, (event, args) => {
            if (cellMenu.onAfterMenuShow) {
              cellMenu.onAfterMenuShow(event, args);
            }
          });
        }
      }
      return this._addon;
    }
    return null;
  }

  /** Translate the Cell Menu titles, we need to loop through all column definition to re-translate them */
  translateCellMenu() {
    if (this.sharedService.gridOptions && this.sharedService.gridOptions.cellMenu) {
      this.resetMenuTranslations(this.sharedService.allColumns);
    }
  }

  /**
   * @return default Action Cell Menu options
   */
  private getDefaultCellMenuOptions(): CellMenuOption {
    return {
      width: 180,
    };
  }

  /**
   * Reset all the internal Menu options which have text to translate
   * @param grid menu object
   */
  private resetMenuTranslations(columnDefinitions: Column[]) {
    const gridOptions = this.sharedService && this.sharedService.gridOptions;

    if (gridOptions && gridOptions.enableTranslate) {
      columnDefinitions.forEach((columnDef: Column) => {
        if (columnDef && columnDef.cellMenu && (Array.isArray(columnDef.cellMenu.commandItems) || Array.isArray(columnDef.cellMenu.optionItems))) {
          // get both items list
          const columnCellMenuCommandItems: Array<MenuCommandItem | 'divider'> = columnDef.cellMenu.commandItems || [];
          const columnCellMenuOptionItems: Array<MenuOptionItem | 'divider'> = columnDef.cellMenu.optionItems || [];

          // translate their titles only if they have a titleKey defined
          if (columnDef.cellMenu.commandTitleKey) {
            columnDef.cellMenu.commandTitle = this.translaterService && this.translaterService.getCurrentLocale && this.translaterService.translate && this.translaterService.translate(columnDef.cellMenu.commandTitleKey) || this._locales && this._locales.TEXT_COMMANDS || columnDef.cellMenu.commandTitle;
          }
          if (columnDef.cellMenu.optionTitleKey) {
            columnDef.cellMenu.optionTitle = this.translaterService && this.translaterService.getCurrentLocale && this.translaterService.translate && this.translaterService.translate(columnDef.cellMenu.optionTitleKey) || columnDef.cellMenu.optionTitle;
          }

          // translate both command/option items (whichever is provided)
          this.extensionUtility.translateItems(columnCellMenuCommandItems, 'titleKey', 'title');
          this.extensionUtility.translateItems(columnCellMenuOptionItems, 'titleKey', 'title');
        }
      });
    }
  }

  sortMenuItems(columnDefinitions: Column[]) {
    columnDefinitions.forEach((columnDef: Column) => {
      if (columnDef && columnDef.cellMenu && columnDef.cellMenu.commandItems) {
        // get both items list
        const columnCellMenuCommandItems: Array<MenuCommandItem | 'divider'> = columnDef.cellMenu.commandItems || [];
        const columnCellMenuOptionItems: Array<MenuOptionItem | 'divider'> = columnDef.cellMenu.optionItems || [];

        this.extensionUtility.sortItems(columnCellMenuCommandItems, 'positionOrder');
        this.extensionUtility.sortItems(columnCellMenuOptionItems, 'positionOrder');
      }
    });
  }
}
