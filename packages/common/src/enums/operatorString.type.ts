export type OperatorString =
  | ''
  | '<>'
  | '!='
  | '='
  | '=='
  | '>'
  | '>='
  | '<'
  | '<='
  | '*'
  | 'a*'
  | '*z'
  | 'a*z'
  | 'Custom'
  | 'EQ'
  | 'GE'
  | 'GT'
  | 'NE'
  | 'LE'
  | 'LT'
  | 'IN'
  | 'NIN'
  | 'NOT_IN'
  | 'IN_CONTAINS'
  | 'NIN_CONTAINS'
  | 'NOT_IN_CONTAINS'
  | 'NOT_CONTAINS'
  | 'Not_Contains'
  | 'CONTAINS'
  | 'Contains'
  | 'EndsWith'
  | 'StartsWith'
  | 'StartsWithEndsWith'
  | 'RangeInclusive'
  | 'RangeExclusive'
  | 'IN_COLLECTION'
  | 'NOT_IN_COLLECTION';