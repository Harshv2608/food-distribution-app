# Exact User Journeys (Flows)

## Flow 1: Donor Onboarding & Setup
1. **Registration:** Donor signs up and provides basic details (Location, Contact, Hours).
2. **Verification (Optional/Admin):** Admin reviews and approves the Donor account.
3. **Configuration:** Donor sets defaults to speed up future donations:
   * Typical Food: e.g., Rice, Curry.
   * Typical Prep Time: e.g., 7:30 PM.
   * Default Storage: e.g., Refrigerated.
   * Preferred Pickup: NGO Pickup.

## Flow 2: Quick Donation Creation (The 9 PM Scenario)
1. **Initiation:** Donor logs in and clicks "Quick Donate".
2. **Pre-fill:** System loads profile defaults and marks them as `🟡 Estimated`.
3. **Confirmation:** Donor inputs specific Quantity (e.g., 12 kg), optionally uploads an image, and confirms the defaults (changing them to `🟢 Confirmed`).
4. **Risk Assessment:** System runs rule-based checks (time, storage, category, expiry).
5. **State Change:** Donation enters `AVAILABLE` state.

## Flow 3: Matching & NGO Claim
1. **Matching Engine:** System finds verified NGOs within the radius.
2. **Scoring:** Calculates match percentage based on: Food compatibility (35%), Distance (25%), Quantity (20%), Time compatibility (20%), and Urgency.
3. **Discovery:** NGO logs in and sees "Recommended (⭐ 93% Match)" and "Nearby donations".
4. **Claiming:** NGO selects a donation and clicks "Claim".
5. **State Change:** Donation enters `CLAIMED` state.

## Flow 4: Pickup & Completion (MVP: NGO Pickup)
1. **Assignment:** NGO assigns a driver/member to pick up the food.
2. **State Change:** Donation enters `PICKUP_ASSIGNED`.
3. **Collection:** NGO arrives at Donor location and collects food.
4. **State Change:** Donation enters `PICKED_UP`.
5. **Distribution:** NGO transports food to their facility/beneficiaries.
6. **State Change:** Donation enters `DELIVERED` -> `COMPLETED`.
7. **Gamification:** System awards Impact Points to both Donor and NGO for successful completion.

## Flow 5: Expiration / Failure
1. **Scenario A (Expired):** Time limit reached before claim. State `AVAILABLE` -> `EXPIRED`.
2. **Scenario B (Cancelled):** Donor cancels before pickup. State `AVAILABLE` or `CLAIMED` -> `CANCELLED`.
