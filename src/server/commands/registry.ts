import type { Actor, CommandReceipt } from "./framework";
import {
  adoptWeekProposalCommand, applyPlanChangeCommand, cancelPreviewCommand, createPreviewCommand, generateProposalCommand,
  correctCookRecordCommand, recordCookedCommand, recordLeftoverShortfallCommand, setNightLockCommand, setPlateCommand,
} from "./plan";
import {
  addProductCommand, approvePurchaseLinesCommand, approveStapleProductCommand, captureHouseholdNeedCommand, chooseProductCommand, confirmOrderCommand, mapRequestCommand,
  recordAvailabilityCommand, recordPriceCommand, recordReceiptCommand, removeRequestCommand, validateSubstitutionCommand,
} from "./groceries";
import { resolveUncertainTransferCommand, startHandoff } from "./purchasing";
import { addStapleCommand, setStapleActiveCommand, updateStapleCommand } from "./staples";
import {
  addRecipeNoteCommand, archiveInterestCommand, archiveRecipeCommand, reviewIngredientCommand, saveInterestCommand, saveRecipeVersionCommand,
  setFavoriteCommand, setRecipePreferenceCommand,
} from "./library";
import { clearNutritionMatchCommand, confirmNutritionMatchCommand } from "./nutrition";
import { addExclusionCommand, removeExclusionCommand, setTargetsCommand, updateSettingsCommand } from "./household";
import { disconnectKrogerCommand, setKrogerLocationCommand } from "./kroger";
import { archiveLinkCommand, saveLinkCommand } from "./sources";
import { prepareInstacartListCommand, setShoppingDestinationCommand } from "./destinations";
import { confirmImportDraftCommand, discardImportDraftCommand, pasteIngredientsCommand, updateImportDraftCommand } from "./imports";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (actor: Actor, operationId: string, payload: any) => Promise<CommandReceipt>;

export const COMMANDS: Record<string, Handler> = {
  GenerateProposal: generateProposalCommand,
  AdoptWeekProposal: adoptWeekProposalCommand,
  CreatePreview: createPreviewCommand,
  CancelPreview: cancelPreviewCommand,
  ApplyPlanChange: applyPlanChangeCommand,
  SetNightLock: setNightLockCommand,
  SetPlate: setPlateCommand,
  RecordLeftoverShortfall: recordLeftoverShortfallCommand,
  RecordCooked: recordCookedCommand,
  CorrectCookRecord: correctCookRecordCommand,
  CaptureHouseholdNeed: captureHouseholdNeedCommand,
  RemoveRequest: removeRequestCommand,
  MapRequest: mapRequestCommand,
  RecordAvailability: recordAvailabilityCommand,
  AddProduct: addProductCommand,
  ChooseProduct: chooseProductCommand,
  RecordPrice: recordPriceCommand,
  ApprovePurchaseLines: approvePurchaseLinesCommand,
  ApproveStapleProduct: approveStapleProductCommand,
  AddStaple: addStapleCommand,
  UpdateStaple: updateStapleCommand,
  SetStapleActive: setStapleActiveCommand,
  StartHandoff: startHandoff,
  ResolveUncertainTransfer: resolveUncertainTransferCommand,
  ConfirmOrder: confirmOrderCommand,
  RecordReceipt: recordReceiptCommand,
  ValidateSubstitution: validateSubstitutionCommand,
  SaveInterest: saveInterestCommand,
  ArchiveInterest: archiveInterestCommand,
  SetRecipePreference: setRecipePreferenceCommand,
  SetFavorite: setFavoriteCommand,
  AddRecipeNote: addRecipeNoteCommand,
  SaveRecipeVersion: saveRecipeVersionCommand,
  SaveLink: saveLinkCommand,
  ArchiveLink: archiveLinkCommand,
  // Drafts read from a page are created only by the server import route (not a client command).
  PasteIngredients: pasteIngredientsCommand,
  UpdateImportDraft: updateImportDraftCommand,
  DiscardImportDraft: discardImportDraftCommand,
  ConfirmImportDraft: confirmImportDraftCommand,
  SetShoppingDestination: setShoppingDestinationCommand,
  PrepareInstacartList: (a, o, p) => prepareInstacartListCommand(a, o, p),
  ArchiveRecipe: archiveRecipeCommand,
  ReviewIngredient: reviewIngredientCommand,
  UpdateSettings: updateSettingsCommand,
  SetTargets: setTargetsCommand,
  AddExclusion: addExclusionCommand,
  RemoveExclusion: removeExclusionCommand,
  DisconnectKroger: disconnectKrogerCommand,
  SetKrogerLocation: setKrogerLocationCommand,
  ConfirmNutritionMatch: (actor, operationId, payload) => confirmNutritionMatchCommand(actor, operationId, payload),
  ClearNutritionMatch: clearNutritionMatchCommand,
};
