import type { Actor, CommandReceipt } from "./framework";
import {
  adoptWeekProposalCommand, applyPlanChangeCommand, cancelPreviewCommand, createPreviewCommand, generateProposalCommand,
  recordCookedCommand, recordLeftoverShortfallCommand, setNightLockCommand, setPlateCommand,
} from "./plan";
import {
  addProductCommand, approvePurchaseLinesCommand, approveStapleProductCommand, captureHouseholdNeedCommand, chooseProductCommand, confirmOrderCommand, mapRequestCommand,
  recordAvailabilityCommand, recordPriceCommand, recordReceiptCommand, removeRequestCommand, validateSubstitutionCommand,
} from "./groceries";
import { resolveUncertainTransferCommand, startHandoff } from "./purchasing";
import {
  addRecipeNoteCommand, archiveInterestCommand, archiveRecipeCommand, reviewIngredientCommand, saveInterestCommand, saveRecipeVersionCommand,
  setFavoriteCommand, setRecipePreferenceCommand,
} from "./library";
import { addExclusionCommand, removeExclusionCommand, setTargetsCommand, updateSettingsCommand } from "./household";

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
  CaptureHouseholdNeed: captureHouseholdNeedCommand,
  RemoveRequest: removeRequestCommand,
  MapRequest: mapRequestCommand,
  RecordAvailability: recordAvailabilityCommand,
  AddProduct: addProductCommand,
  ChooseProduct: chooseProductCommand,
  RecordPrice: recordPriceCommand,
  ApprovePurchaseLines: approvePurchaseLinesCommand,
  ApproveStapleProduct: approveStapleProductCommand,
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
  ArchiveRecipe: archiveRecipeCommand,
  ReviewIngredient: reviewIngredientCommand,
  UpdateSettings: updateSettingsCommand,
  SetTargets: setTargetsCommand,
  AddExclusion: addExclusionCommand,
  RemoveExclusion: removeExclusionCommand,
};
