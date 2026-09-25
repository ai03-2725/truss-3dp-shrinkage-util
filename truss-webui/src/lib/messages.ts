// Locale-specific short messages shared by components and dynamic UI state.
// Longer, formatted per-screen copy lives in src/pages/<locale>/ instead.
// Japanese starts as exact English placeholders (public-release translation is a
// separate gate).

import type { LocaleId } from './locale.ts'
import type { PrinterError } from './printers.ts'
import type { StorageIssue } from './storage.ts'

export interface Messages {
  // Language switcher
  language: string
  chooseLanguage: string

  // Flow chrome
  stepOf: (current: number, total: number) => string
  progressLabel: string
  exitCalibration: string
  back: string
  next: string
  finish: string

  // Confirm dialog
  cancel: string
  exitTitle: string
  exitMessage: string
  exitConfirm: string

  // Measurement fields
  outerMeasurement: string
  innerMeasurement: string
  invalidNumber: string
  lengthRange: string
  gapWarning: string

  // Result percentage
  resultHeading: string
  copy: string
  copied: string
  copiedAnnounce: string
  copyFailedAnnounce: string
  percentRangeWarning: string

  // Flow step titles
  quadEquipmentTitle: string
  quadFilamentTitle: string
  quadSliceTitle: string
  quadPrintTitle: string
  quadLocateTitle: string
  quadXTitle: string
  quadYabTitle: string
  quadNameTitle: string
  quadResultTitle: string
  singlePrinterTitle: string
  singleFilamentTitle: string
  singleSliceTitle: string
  singlePrintTitle: string
  singleMeasureTitle: string
  singleResultTitle: string
  overwriteTitle: string
  overwriteMessage: (name: string) => string
  overwriteConfirm: string

  // Figures and lightbox
  enlargeImage: (alt: string) => string
  zoomIn: string
  zoomOut: string
  reset: string
  resetZoom: string
  close: string
  closeEnlarged: string

  // Storage failures
  storageUnavailable: string
  storageUnreadable: string
  storageMalformed: string

  // Printer management / import errors
  printerNameRequired: string
  printerNameDuplicate: (name: string) => string
  printerFactorInvalid: string
  printerNotFound: string
  printerNameLabel: string
  extrapolationFactorLabel: string
  factorRangeWarning: string
  save: string
  importInvalidJson: string
  importNotExportObject: string
  importUnsupportedVersion: (expected: number) => string
  importPrintersList: string
  importEntryNotObject: string
  importEntryNameEmpty: string
  importEntryFactorInvalid: (name: string) => string
  importDuplicateInFile: (name: string) => string
}

const EN: Messages = {
  language: 'Language',
  chooseLanguage: 'Choose a language',

  stepOf: (current, total) => `Step ${current} of ${total}`,
  progressLabel: 'Calibration progress',
  exitCalibration: 'Exit calibration',
  back: 'Back',
  next: 'Next',
  finish: 'Finish',

  cancel: 'Cancel',
  exitTitle: 'Exit calibration?',
  exitMessage:
    "Leaving now discards currently entered measurement values.",
  exitConfirm: 'Exit and clear progress',

  outerMeasurement: 'Outer measurement',
  innerMeasurement: 'Inner measurement',
  invalidNumber: 'Enter a positive number, using a period as the decimal separator.',
  lengthRange: 'This is outside the expected 135–142 mm range. Double-check the measurement.',
  gapWarning:
    'The inner and outer measurements differ by more than 0.4 mm. Recheck both measurements and your filament tuning before continuing.',

  resultHeading: 'Updated XY shrinkage percentage to use:',
  copy: 'Copy',
  copied: 'Copied!',
  copiedAnnounce: 'Value copied to clipboard',
  copyFailedAnnounce: 'Could not copy the value',
  percentRangeWarning:
    'This percentage is outside the usual 90–110% range. Double-check that you are entering the correct value from your slicer.',

  quadEquipmentTitle: 'Equipment check',
  quadFilamentTitle: 'Filament tuning',
  quadSliceTitle: 'Slice the Quad beam',
  quadPrintTitle: 'Print and remove',
  quadLocateTitle: 'Locate the X beam',
  quadXTitle: 'Measure the X beam',
  quadYabTitle: 'Measure the Y, A, and B beams',
  quadNameTitle: 'Name this printer',
  quadResultTitle: 'Calculating XY shrinkage',
  singlePrinterTitle: 'Select a printer',
  singleFilamentTitle: 'Filament tuning',
  singleSliceTitle: 'Slice the Single beam',
  singlePrintTitle: 'Print and remove',
  singleMeasureTitle: 'Measure the X beam',
  singleResultTitle: 'Calculating XY shrinkage',
  overwriteTitle: 'Overwrite saved printer?',
  overwriteMessage: (name) =>
    `“${name}” already exists. Continuing overwrites its old extrapolation factor with this new one. Only do this when recalibrating that printer.`,
  overwriteConfirm: 'Overwrite and continue',

  enlargeImage: (alt) => `Enlarge image: ${alt}`,
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  reset: 'Reset',
  resetZoom: 'Reset zoom',
  close: 'Close',
  closeEnlarged: 'Close enlarged image',

  storageUnavailable:
    'Browser storage is unavailable. Your progress and printer profiles may not survive closing or refreshing the app. You can still calibrate and note the results down manually.',
  storageUnreadable: 'Saved data could not be read and was reset.',
  storageMalformed: 'Saved data was malformed and was reset.',

  printerNameRequired: 'Printer name is required.',
  printerNameDuplicate: (name) => `A printer named “${name}” already exists.`,
  printerFactorInvalid: 'Enter a finite, positive extrapolation factor.',
  printerNotFound: 'Printer not found.',
  printerNameLabel: 'Printer name',
  extrapolationFactorLabel: 'Extrapolation factor',
  factorRangeWarning:
    'This factor is outside the usual 0.9–1.1 range. Double-check it before saving.',
  save: 'Save',
  importInvalidJson: 'The file is not valid JSON.',
  importNotExportObject: 'The file must contain a printer export object.',
  importUnsupportedVersion: (expected) => `Unsupported file version. Expected version ${expected}.`,
  importPrintersList: 'The file must contain a list of printers.',
  importEntryNotObject: 'Every printer entry must be an object.',
  importEntryNameEmpty: 'Every printer entry needs a non-empty name.',
  importEntryFactorInvalid: (name) => `“${name}” has an invalid extrapolation factor.`,
  importDuplicateInFile: (name) => `The file contains duplicate printer name “${name}”.`,
}

// PLACEHOLDER: Japanese still uses the English wording throughout. Replace via
// implementation-plan task 9 before public release.
const JA: Messages = {
    language: '言語',
  chooseLanguage: '言語を選択してください',

  stepOf: (current, total) => `ステップ ${current} / ${total}`,
  progressLabel: '進捗状況',
  exitCalibration: '補正を中止する',
  back: '戻る',
  next: '次へ',
  finish: '終了',

  cancel: '戻る',
  exitTitle: '補正を中止しますか？',
  exitMessage:
    "中止した場合、現在入力した数値は破棄されます。",
  exitConfirm: '中止する',

  outerMeasurement: '外側の測定',
  innerMeasurement: '内側の測定',
  invalidNumber: '正の数値を入力してください。',
  lengthRange: '想定される135〜142mmの範囲外です。測定値をもう一度確認することを推奨します。',
  gapWarning:
    '内側と外側の測定値が0.4mmを超えています。フィラメントの事前調整や印刷設定をもう一度確認することを推奨します。',

  resultHeading: '新たに計算されたXY収縮設定:',
  copy: 'コピー',
  copied: 'コピーされました',
  copiedAnnounce: '数値がコピーされました',
  copyFailedAnnounce: 'コピーできませんでした',
  percentRangeWarning:
    '入力された数値は90〜110%の想定範囲外です。もう一度ご確認ください。',

  quadEquipmentTitle: '機材の事前確認',
  quadFilamentTitle: 'フィラメントの事前確認',
  quadSliceTitle: '補正用モデルの読み込み',
  quadPrintTitle: 'プリントと取り外し',
  quadLocateTitle: 'X梁の確認',
  quadXTitle: 'X梁の測定',
  quadYabTitle: 'Y/A/B梁の測定',
  quadNameTitle: 'プリンターの保存',
  quadResultTitle: '収縮率の計算',
  singlePrinterTitle: 'プリンターの選択',
  singleFilamentTitle: 'フィラメントの事前確認',
  singleSliceTitle: '補正用モデルの読み込み',
  singlePrintTitle: 'プリントと取り外し',
  singleMeasureTitle: '梁の測定',
  singleResultTitle: '収縮率の計算',
  overwriteTitle: '上書き保存しますか?',
  overwriteMessage: (name) =>
    `「${name}」という名前のプリンターはすでに保存されています。上書き保存する場合、現在保存されている外挿係数は破棄されます。`,
  overwriteConfirm: '上書き保存',

  enlargeImage: (alt) => `画像「${alt}」を拡大する`,
  zoomIn: '拡大',
  zoomOut: '縮小',
  reset: '初期化',
  resetZoom: '初期化',
  close: '閉じる',
  closeEnlarged: '画像を閉じる',

  storageUnavailable:
    'ブラウザのストレージを利用できません。プリンターの係数情報などは保存されません。',
  storageUnreadable: '保存されていたプリンター情報を読み込めなかったため、リセットしました。',
  storageMalformed: '保存されていたプリンター情報が破損していたため、リセットされました。',

  printerNameRequired: '名前が必要です',
  printerNameDuplicate: (name) => `「${name}」という名前のプリンターはすでに存在します`,
  printerFactorInvalid: '正の数値を入力してください',
  printerNotFound: 'プリンターが見つかりませんでした',
  printerNameLabel: 'プリンター名',
  extrapolationFactorLabel: '外挿係数',
  factorRangeWarning:
    '外挿係数が0.9〜1.1の想定範囲外です。もう一度ご確認ください。',
  save: '保存',
  importInvalidJson: '読み込んだファイルのJSON構造が正しくありません。',
  importNotExportObject: '読み込んだファイルにプリンター情報が含まれていません。',
  importUnsupportedVersion: (expected) => `読み込んだファイルのバージョンに対応していません。現在はバージョン「${expected}」を想定しています。`,
  importPrintersList: 'ファイルはプリンターリストを含んでいる必要があります。',
  importEntryNotObject: 'プリンターリストの各プリンターは正しい構造のJSONオブジェクトである必要があります。',
  importEntryNameEmpty: 'プリンターリストの各プリンターに名前が必要です。',
  importEntryFactorInvalid: (name) => `読み込んだプリンター「${name}」に不正な外挿係数が設定されています。`,
  importDuplicateInFile: (name) => `読み込んだファイル内に名前「${name}」のプリンターが重複しています。`,
}

const MESSAGES: Record<LocaleId, Messages> = { en: EN, ja: JA }

export function messages(locale: LocaleId): Messages {
  return MESSAGES[locale] ?? EN
}

export function storageMessage(locale: LocaleId, issue: StorageIssue): string {
  const t = messages(locale)
  switch (issue) {
    case 'unavailable':
      return t.storageUnavailable
    case 'unreadable':
      return t.storageUnreadable
    case 'malformed':
      return t.storageMalformed
  }
}

export function printerErrorMessage(locale: LocaleId, error: PrinterError): string {
  const t = messages(locale)
  switch (error.code) {
    case 'nameRequired':
      return t.printerNameRequired
    case 'nameDuplicate':
      return t.printerNameDuplicate(error.name)
    case 'factorInvalid':
      return t.printerFactorInvalid
    case 'notFound':
      return t.printerNotFound
    case 'invalidJson':
      return t.importInvalidJson
    case 'notExportObject':
      return t.importNotExportObject
    case 'unsupportedVersion':
      return t.importUnsupportedVersion(error.expected)
    case 'printersList':
      return t.importPrintersList
    case 'entryNotObject':
      return t.importEntryNotObject
    case 'entryNameEmpty':
      return t.importEntryNameEmpty
    case 'entryFactorInvalid':
      return t.importEntryFactorInvalid(error.name)
    case 'duplicateInFile':
      return t.importDuplicateInFile(error.name)
  }
}
