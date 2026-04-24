/**
 * COMPOSABLE: usePickupDate (usePickupDate.js)
 * SCOPO: Gestisce la logica delle date di ritiro per il carosello Swiper.
 *
 * DOVE SI USA: pages/la-tua-spedizione/[step].vue (step 2 — selezione data ritiro)
 *
 * COSA RESTITUISCE:
 *   - daysInMonth: computed con i giorni lavorativi (Lun-Ven) disponibili
 *   - chooseDate(day): seleziona/deseleziona un giorno di ritiro
 *   - dateError: ref errore data mancante
 *   - days: array delle abbreviazioni dei giorni lavorativi
 *   - pickupDateSectionRef: ref per scroll to section
 *   - focusPickupDateSection(): scrolla alla sezione date
 */
export function usePickupDate(services) {
  const dateError = ref(null);
  const pickupDateSectionRef = ref(null);

  const days = ["Lun", "Mar", "Mer", "Gio", "Ven"];

  // Seleziona/deseleziona un giorno di ritiro dal carosello
  const chooseDate = (day) => {
    const lastDay = day.date.toLocaleDateString();
    if (!services.value.date || services.value.date != lastDay) {
      services.value.date = day.date.toLocaleDateString();
      dateError.value = null;
    } else {
      services.value.date = "";
    }
  };

  // Genera la lista dei giorni lavorativi (Lun-Ven) del mese corrente e successivo
  const daysInMonth = computed(() => {
    const arr = [];

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate() + 1;

    // Giorni rimanenti del mese corrente
    const daysCurrentMonth = new Date(year, month + 1, 0).getDate();
    for (let i = day; i <= daysCurrentMonth; i++) {
      const date = new Date(year, month, i);

      const weekday = date.toLocaleString("default", { weekday: "short" });
      const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

      const monthAbbr = date.toLocaleString("default", { month: "short" });
      const formattedMonthAbbr = monthAbbr.charAt(0).toUpperCase() + monthAbbr.slice(1);

      if (formattedWeekday !== "Sab" && formattedWeekday !== "Dom") {
        arr.push({
          date,
          weekday: formattedWeekday,
          dayNumber: date.getDate(),
          monthAbbr: formattedMonthAbbr,
        });
      }
    }

    // Tutti i giorni del mese successivo
    const nextMonth = month + 1;
    const daysNextMonth = new Date(year, nextMonth + 1, 0).getDate();
    for (let i = 1; i <= daysNextMonth; i++) {
      const date = new Date(year, nextMonth, i);

      const weekday = date.toLocaleString("default", { weekday: "short" });
      const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

      const monthAbbr = date.toLocaleString("default", { month: "short" });
      const formattedMonthAbbr = monthAbbr.charAt(0).toUpperCase() + monthAbbr.slice(1);

      if (formattedWeekday !== "Sab" && formattedWeekday !== "Dom") {
        arr.push({
          date,
          weekday: formattedWeekday,
          dayNumber: date.getDate(),
          monthAbbr: formattedMonthAbbr,
        });
      }
    }

    return arr;
  });

  const focusPickupDateSection = () => {
    nextTick(() => {
      const sectionEl = pickupDateSectionRef.value;
      if (sectionEl && typeof sectionEl.scrollIntoView === 'function') {
        sectionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const firstDateInput = document.querySelector('[id^="date-"]');
      if (firstDateInput && typeof firstDateInput.focus === 'function') {
        firstDateInput.focus({ preventScroll: true });
      }
    });
  };

  return {
    daysInMonth,
    chooseDate,
    dateError,
    days,
    pickupDateSectionRef,
    focusPickupDateSection,
  };
}
