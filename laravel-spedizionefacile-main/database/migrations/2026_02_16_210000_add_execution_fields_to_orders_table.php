<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('pickup_status')->nullable()->after('brt_raw_response');
            $table->string('pickup_reference')->nullable()->after('pickup_status');
            $table->timestamp('pickup_requested_at')->nullable()->after('pickup_reference');
            $table->string('pickup_time_slot')->nullable()->after('pickup_requested_at');
            $table->string('pickup_notes', 255)->nullable()->after('pickup_time_slot');

            $table->string('bordero_status')->nullable()->after('pickup_notes');
            $table->string('bordero_reference')->nullable()->after('bordero_status');
            $table->longText('bordero_document_base64')->nullable()->after('bordero_reference');
            $table->string('bordero_document_mime')->nullable()->after('bordero_document_base64');
            $table->string('bordero_document_filename')->nullable()->after('bordero_document_mime');

            $table->string('documents_status')->nullable()->after('bordero_document_filename');
            $table->timestamp('documents_sent_customer_at')->nullable()->after('documents_status');
            $table->timestamp('documents_sent_admin_at')->nullable()->after('documents_sent_customer_at');
            $table->text('execution_error')->nullable()->after('documents_sent_admin_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'pickup_status',
                'pickup_reference',
                'pickup_requested_at',
                'pickup_time_slot',
                'pickup_notes',
                'bordero_status',
                'bordero_reference',
                'bordero_document_base64',
                'bordero_document_mime',
                'bordero_document_filename',
                'documents_status',
                'documents_sent_customer_at',
                'documents_sent_admin_at',
                'execution_error',
            ]);
        });
    }
};
