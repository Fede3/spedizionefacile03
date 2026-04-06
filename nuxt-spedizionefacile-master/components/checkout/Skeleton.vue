<!--
  Checkout skeleton placeholder shown while the page initialises.
  Pure presentational — no props, no logic.
  Design: prototype-aligned ring borders, subtle shadows.
-->
<template>
  <div class="space-y-[14px] animate-pulse">
    <div class="h-[56px] rounded-[14px] bg-white" style="outline:1px solid #DFE2E7; outline-offset:-1px"></div>
    <div class="grid grid-cols-1 desktop:grid-cols-[minmax(0,1fr)_380px] gap-[16px]">
      <div class="space-y-[14px]">
        <div class="rounded-[14px] bg-white p-[18px] tablet:p-[22px] space-y-[12px]" style="outline:1px solid #DFE2E7; outline-offset:-1px">
          <div class="h-[22px] w-[42%] rounded-[10px] bg-[#F4F6F8]"></div>
          <div class="grid grid-cols-1 tablet:grid-cols-2 gap-[10px]">
            <div class="h-[110px] rounded-[14px] bg-[#F8F9FB]" style="outline:1px solid #DFE2E7; outline-offset:-1px"></div>
            <div class="h-[110px] rounded-[14px] bg-[#F8F9FB]" style="outline:1px solid #DFE2E7; outline-offset:-1px"></div>
          </div>
          <div class="h-[50px] rounded-[12px] bg-[#F4F6F8]"></div>
        </div>
        <div class="rounded-[14px] bg-white p-[18px] tablet:p-[22px] space-y-[12px]" style="outline:1px solid #DFE2E7; outline-offset:-1px">
          <div class="h-[22px] w-[56%] rounded-[10px] bg-[#F4F6F8]"></div>
          <div class="h-[40px] rounded-[14px] bg-[#F8F9FB]"></div>
        </div>
        <div class="rounded-[14px] bg-white p-[18px] space-y-[12px]" style="outline:1px solid #DFE2E7; outline-offset:-1px">
          <div class="h-[82px] rounded-[12px] bg-[#F8F9FB]"></div>
          <div class="h-[52px] rounded-[100px] bg-[#C0C5CC]"></div>
        </div>
      </div>
      <div class="rounded-[14px] bg-white p-[18px] space-y-[12px]" style="outline:1px solid #DFE2E7; outline-offset:-1px">
        <div class="h-[20px] w-[58%] rounded-[10px] bg-[#F4F6F8]"></div>
        <div class="h-[110px] rounded-[12px] bg-[#F8F9FB]"></div>
        <div class="h-[1px] bg-[#EEF0F3]"></div>
        <div class="h-[40px] rounded-[10px] bg-[#F4F6F8]"></div>
      </div>
    </div>
  </div>
</template>
