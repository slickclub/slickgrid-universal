import { EmptyWarning, GridOption, sanitizeTextByAvailableSanitizer, SlickGrid } from '@slickgrid-universal/common';

export class SlickEmptyWarningComponent {
  private _warningElement: HTMLDivElement | null;

  /** Getter for the Grid Options pulled through the Grid Object */
  get gridOptions(): GridOption {
    return (this.grid && this.grid.getOptions) ? this.grid.getOptions() : {};
  }

  constructor(private grid: SlickGrid) { }

  dispose() {
    this._warningElement?.remove();
  }

  /**
    this.angularGrid.destroy();	   * Display a warning of empty data when the filtered dataset is empty
   * NOTE: to make this code reusable, you could (should) move this code into a utility service
   * @param gridSelector - HTML Selector of the grid <div>
   * @param emptyMessage - empty data message to display in the <span>
   * @param isShowing - are we showing the message?
   * @param options - any styling options you'd like to pass like the text color
   */
  showEmptyDataMessage(gridSelector: string, isShowing = true, emptyMessage?: string, options?: EmptyWarning) {
    const gridUid = this.grid.getUID();
    const mergedOptions = { ...this.gridOptions.emptyDataWarning, options };
    const emptyDataClassName = mergedOptions.class || 'slick-empty-data-warning';
    const finalClassNames = [gridUid, emptyDataClassName];
    this._warningElement = document.querySelector<HTMLDivElement>(`.${finalClassNames.join('.')}`);
    const gridElm = document.querySelector<HTMLDivElement>(gridSelector);

    // calculate margins
    const gridHeaderFilterRowHeight = this.gridOptions?.headerRowHeight ?? 30; // filter row height
    const headerRowCount = 2; // header title row is calculated by SASS and defined as (17px * headerRowCount + paddingTopBottom)
    const headerRowPaddingTopBottom = 10; // 5px (2x for both top/bottom), this is different in each SASS Theme
    const headerRowHeight = 17 * headerRowCount + headerRowPaddingTopBottom;
    const warningMessage = emptyMessage ?? mergedOptions.message ?? 'No data to display.';
    const preHeaderRowHeight = this.gridOptions.showPreHeaderPanel && this.gridOptions.preHeaderPanelHeight || 0;
    const marginTop = (mergedOptions.marginTop ?? (headerRowHeight + gridHeaderFilterRowHeight + 5)) + preHeaderRowHeight;
    const marginLeft = mergedOptions.marginLeft ?? 10;

    if (!this._warningElement) {
      const sanitizedOptions = this.gridOptions && this.gridOptions.sanitizeHtmlOptions || {};
      const sanitizedText = sanitizeTextByAvailableSanitizer(this.gridOptions, warningMessage, sanitizedOptions);

      this._warningElement = document.createElement('div');
      this._warningElement.className = finalClassNames.join(' ');
      this._warningElement.innerHTML = sanitizedText;
      document.body.appendChild(this._warningElement);
    }

    if (gridElm && this._warningElement) {
      if (isShowing) {
        const gridPosition = gridElm.getBoundingClientRect();
        this._warningElement.style.top = `${gridPosition.top + marginTop}px`;
        this._warningElement.style.left = `${gridPosition.left + marginLeft}px`;
      }
      this._warningElement.style.display = isShowing ? 'inline' : 'none';
    }
  }
}
