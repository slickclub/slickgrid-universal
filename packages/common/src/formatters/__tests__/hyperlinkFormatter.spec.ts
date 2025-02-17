import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Column } from '../../interfaces/index.js';
import { hyperlinkFormatter } from '../hyperlinkFormatter.js';
import type { SlickGrid } from '../../core/index.js';

const gridStub = {
  getData: vi.fn(),
  getOptions: vi.fn(),
  sanitizeHtmlString: (str) => str,
} as unknown as SlickGrid;

describe('the Hyperlink Formatter', () => {
  beforeEach(() => {
    vi.spyOn(gridStub, 'getOptions').mockReturnValue(undefined as any);
  });

  it('should return empty string when value is not an hyperlink and is empty', () => {
    const result = hyperlinkFormatter(0, 0, '', {} as Column, {}, gridStub);
    expect(result).toBe('');
  });

  it('should return original value when value is not an hyperlink', () => {
    const result = hyperlinkFormatter(0, 0, 'anything', {} as Column, {}, gridStub);
    expect(result).toBe('anything');
  });

  it('should return original value when URL passed through the generic params "hyperlinkUrl" is not a valid hyperlink', () => {
    const hyperlinkUrl1 = '';
    const inputValue = 'Company Name';
    const result1 = hyperlinkFormatter(0, 0, inputValue, { params: { hyperlinkUrl: hyperlinkUrl1 } } as Column, {}, gridStub);
    expect(result1).toBe(inputValue);
  });

  it('should return original value when value is not a valid hyperlink', () => {
    const inputValue1 = 'http:/something.com';
    const inputValue2 = 'https//something.com';
    const inputValue3 = 'ftpp://something.com';

    const result1 = hyperlinkFormatter(0, 0, inputValue1, {} as Column, {}, gridStub);
    const result2 = hyperlinkFormatter(0, 0, inputValue2, {} as Column, {}, gridStub);
    const result3 = hyperlinkFormatter(0, 0, inputValue3, {} as Column, {}, gridStub);

    expect(result1).toBe(inputValue1);
    expect(result2).toBe(inputValue2);
    expect(result3).toBe(inputValue3);
  });

  it('should return an href link when input value is a valid hyperlink', () => {
    const inputValue1 = 'http://something.com';
    const inputValue2 = 'https://something.com';
    const inputValue3 = 'ftp://something.com';

    const result1 = hyperlinkFormatter(0, 0, inputValue1, {} as Column, {}, gridStub);
    const result2 = hyperlinkFormatter(0, 0, inputValue2, {} as Column, {}, gridStub);
    const result3 = hyperlinkFormatter(0, 0, inputValue3, {} as Column, {}, gridStub);

    expect((result1 as HTMLElement).outerHTML).toBe(`<a href="${inputValue1}">${inputValue1}</a>`);
    expect((result2 as HTMLElement).outerHTML).toBe(`<a href="${inputValue2}">${inputValue2}</a>`);
    expect((result3 as HTMLElement).outerHTML).toBe(`<a href="${inputValue3}">${inputValue3}</a>`);
  });

  it('should return an href link with a different text when input value is a valid hyperlink and has the generic params "hyperlinkText" provided', () => {
    const inputValue1 = 'http://something.com';
    const inputValue2 = 'https://something.com';
    const inputValue3 = 'ftp://something.com';
    const linkText = 'Company Website';

    const result1 = hyperlinkFormatter(0, 0, inputValue1, { params: { hyperlinkText: linkText } } as Column, {}, gridStub);
    const result2 = hyperlinkFormatter(0, 0, inputValue2, { params: { hyperlinkText: linkText } } as Column, {}, gridStub);
    const result3 = hyperlinkFormatter(0, 0, inputValue3, { params: { hyperlinkText: linkText } } as Column, {}, gridStub);

    expect((result1 as HTMLElement).outerHTML).toBe(`<a href="${inputValue1}">${linkText}</a>`);
    expect((result2 as HTMLElement).outerHTML).toBe(`<a href="${inputValue2}">${linkText}</a>`);
    expect((result3 as HTMLElement).outerHTML).toBe(`<a href="${inputValue3}">${linkText}</a>`);
  });

  it('should return an href link with a different url than value it is provided as a valid hyperlink through the generic params "hyperlinkUrl"', () => {
    const hyperlinkUrl1 = 'http://something.com';
    const hyperlinkUrl2 = 'https://something.com';
    const hyperlinkUrl3 = 'ftp://something.com';
    const inputValue = 'Company Name';

    const result1 = hyperlinkFormatter(0, 0, inputValue, { params: { hyperlinkUrl: hyperlinkUrl1 } } as Column, {}, gridStub);
    const result2 = hyperlinkFormatter(0, 0, inputValue, { params: { hyperlinkUrl: hyperlinkUrl2 } } as Column, {}, gridStub);
    const result3 = hyperlinkFormatter(0, 0, inputValue, { params: { hyperlinkUrl: hyperlinkUrl3 } } as Column, {}, gridStub);

    expect((result1 as HTMLElement).outerHTML).toBe(`<a href="${hyperlinkUrl1}">${inputValue}</a>`);
    expect((result2 as HTMLElement).outerHTML).toBe(`<a href="${hyperlinkUrl2}">${inputValue}</a>`);
    expect((result3 as HTMLElement).outerHTML).toBe(`<a href="${hyperlinkUrl3}">${inputValue}</a>`);
  });

  it('should return an href link when hyperlink URL & Text are provided through the generic params "hyperlinkUrl" and "hyperlinkText"', () => {
    const hyperlinkUrl1 = 'http://something.com';
    const hyperlinkUrl2 = 'https://something.com';
    const hyperlinkUrl3 = 'ftp://something.com';
    const linkText1 = 'Company ABC';
    const linkText2 = 'Company DEF';
    const linkText3 = 'Company XYZ';
    const inputValue = 'anything';

    const result1 = hyperlinkFormatter(0, 0, inputValue, { params: { hyperlinkUrl: hyperlinkUrl1, hyperlinkText: linkText1 } } as Column, {}, gridStub);
    const result2 = hyperlinkFormatter(0, 0, inputValue, { params: { hyperlinkUrl: hyperlinkUrl2, hyperlinkText: linkText2 } } as Column, {}, gridStub);
    const result3 = hyperlinkFormatter(0, 0, inputValue, { params: { hyperlinkUrl: hyperlinkUrl3, hyperlinkText: linkText3 } } as Column, {}, gridStub);

    expect((result1 as HTMLElement).outerHTML).toBe(`<a href="${hyperlinkUrl1}">${linkText1}</a>`);
    expect((result2 as HTMLElement).outerHTML).toBe(`<a href="${hyperlinkUrl2}">${linkText2}</a>`);
    expect((result3 as HTMLElement).outerHTML).toBe(`<a href="${hyperlinkUrl3}">${linkText3}</a>`);
  });
});
