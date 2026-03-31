<?php
/**
 * FILE: AdminController.php (DEPRECATO)
 *
 * Questo controller e' stato suddiviso in controller specifici nella cartella Admin/.
 * Tutti i metodi sono stati spostati nei seguenti controller:
 *
 *   - Admin\DashboardController       -- dashboard()
 *   - Admin\UserManagementController   -- users(), updateUserRole(), updateUserType(), approveUser(), deleteUser()
 *   - Admin\OrderManagementController  -- orders(), updateOrderStatus(), shipments(), updateOrderPudo(), regenerateLabel()
 *   - Admin\WalletManagementController -- walletOverview(), userMovements(), withdrawals(), approveWithdrawal(), rejectWithdrawal()
 *   - Admin\ContentController          -- contactMessages(), markContactMessageRead(), settings(), updateSettings()
 *   - Admin\CouponController           -- index(), store(), update(), destroy()
 *   - Admin\HomepageImageController    -- uploadHomepageImage(), getHomepageImage()
 *   - Admin\ReferralStatsController    -- referralStats()
 *
 * Le route in routes/api.php puntano direttamente ai nuovi controller.
 * Questo file puo' essere eliminato in sicurezza una volta verificato che tutto funzioni.
 *
 * @deprecated Usare i controller in App\Http\Controllers\Admin\ al posto di questo.
 */

namespace App\Http\Controllers;

class AdminController extends Controller
{
    // Nessun metodo: tutto e' stato migrato in Admin\*Controller
}
