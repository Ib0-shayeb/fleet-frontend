
export type RightPanelState =
  | { mode: 'CLOSED' }
  | { mode: 'TRIP_DETAILS'; tripId: number }
  | { mode: 'CHECKLIST_LIST' }
  | { mode: 'CHECKLIST_EDIT'; checklistId: number }
  | { mode: 'DRIVER_CHECKLISTS'; driverId: number };

  export const INITIAL_PANEL_STATE: RightPanelState = { mode: 'CLOSED' };