import { SelectFilter } from './selectFilter';
import { CollectionService } from './../services/collection.service';
import { TranslaterService } from '../services/translater.service';

export class MultipleSelectFilter extends SelectFilter {
  /**
   * Initialize the Filter
   */
  constructor(protected translaterService: TranslaterService, protected collectionService: CollectionService) {
    super(translaterService, collectionService, true);
  }
}
