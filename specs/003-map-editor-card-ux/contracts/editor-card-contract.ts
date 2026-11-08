/**
 * UI Contract: Map Editor Card Layout Tokens & Component Architecture
 * 
 * Defines the layout constraints, dimensional tokens, and component contract
 * ensuring zero layout shifts across state transitions in MapProjectAreaEditor.
 */

export interface EditorCardLayoutTokens {
  /** Fixed horizontal width for primary editor card states (Chooser, Focused, Active Plotting, Draft Entry) */
  cardWidth: 'w-[340px]';
  /** Responsive maximum constraint for narrow viewports */
  cardMaxWidth: 'max-w-[calc(100vw-2rem)]';
  /** Outer padding for primary card states */
  cardPadding: 'p-3';
  /** Border radius for the floating card container */
  cardRadius: 'rounded-2xl';

  /** Action button heights */
  buttonHeights: {
    primary: 'h-8';
    secondary: 'h-7';
  };

  /** Standard icon dimensions */
  iconSize: {
    standard: 'h-3.5 w-3.5';
    micro: 'h-3 w-3';
  };

  /** Scrollable list container */
  scrollableList: {
    maxHeight: 'max-h-[280px]';
    spacing: 'space-y-1';
  };
}

/**
 * Visual states rendered by MapProjectAreaEditor.
 * All states render inside an anchored card adhering to EditorCardLayoutTokens.
 */
export type EditorCardState =
  | 'chooser'
  | 'focused'
  | 'plotting-lot'
  | 'plotting-project-area'
  | 'draft-entry'
  | 'readjust-boundary';
