import { PaymentService, ProFeature } from './paymentService';

export class EntitlementManager {
  /**
   * Checks whether the current user holds an active Pro subscription.
   */
  public static async isPro(): Promise<boolean> {
    const entitlement = await PaymentService.getEntitlement();
    return entitlement.isPro;
  }

  /**
   * Checks whether a specific feature is unlocked for the user.
   */
  public static async canAccess(feature: ProFeature): Promise<boolean> {
    const isPro = await this.isPro();
    if (isPro) return true;

    // Feature gating logic
    switch (feature) {
      case 'ai_vision_unlimited':
      case 'ria_coach_advanced':
      case 'advanced_analytics':
      case 'cloud_backup_priority':
        return false;
      default:
        return true;
    }
  }
}
