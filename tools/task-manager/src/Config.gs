/**
 * Settings for this installation. The only file to edit when setting the app up for a new spreadsheet.
 * Everything else (teams, reminders, members) is managed from the app itself or from the spreadsheet.
 */
const CONFIG = {
  /**
   * The Google Sheet that stores everything. Leave empty when the script is attached to the sheet
   * (Extensions → Apps Script from inside the sheet); otherwise the long id in its address: /spreadsheets/d/<id>/edit.
   */
  SHEET_ID: '',
  /** Shown in the browser tab, emails and the header. */
  APP_NAME: 'IES HU Tasks',
  /** Dates ("due today", reminders) follow this time zone. */
  TIME_ZONE: 'Asia/Amman',
  /** Icon of the browser tab. */
  FAVICON_URL: 'https://ies-hu.vercel.app/icon-192.png',
  /** How long a login lasts on a device. */
  SESSION_DAYS: 30,
};
