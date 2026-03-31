/**
 * COMPOSABLE: useShipmentServices (useShipmentServices.js)
 * SCOPO: Gestisce la logica dei servizi aggiuntivi per la spedizione.
 *
 * DOVE SI USA: pages/la-tua-spedizione/[step].vue (step 2 — servizi)
 *
 * COSA RESTITUISCE:
 *   - services: ref con service_type, date, time
 *   - servicesList: ref lista servizi disponibili con stato selezione
 *   - serviceData: ref dati popup (contrassegno, assicurazione, sponda)
 *   - open: ref stato apertura modal servizio
 *   - selectedService: ref servizio corrente nel modal
 *   - myService / myServiceIndex: ref servizio in lavorazione
 *   - featuredService / regularServices: computed separazione servizi
 *   - smsEmailNotification: ref toggle notifiche SMS/Email
 *   - chooseService(), addService(), removeServiceFromSidebar(), myClose()
 *   - restoreServicesFromStore(): ripristina selezione dallo store
 */
export function useShipmentServices() {
  const userStore = useUserStore();

  // Stato dei servizi selezionati (tipo, data ritiro, orario)
  const services = ref({
    service_type: "",
    date: "",
    time: "",
  });

  // Lista completa dei servizi disponibili
  const servicesList = ref([
    {
      img: "no-label.png",
      width: 78,
      height: 51,
      name: "Spedizione Senza etichetta",
      description: "Non stampare nulla: mostra un codice sul telefono, etichetta applicata al ritiro.",
      isSelected: false,
      featured: true,
    },
    {
      img: "cash-on-delivery.png",
      width: 60,
      height: 51,
      name: "Contrassegno",
      description: "Paga alla consegna: il corriere incassa dal destinatario per conto del mittente.",
      isSelected: false,
      popupDescription:
        "Fai pagare il destinatario al momento della consegna. Il corriere incassa l'importo e lo accredita al mittente secondo la modalità scelta. Se il destinatario non paga o rifiuta, la consegna non viene completata.",
    },
    {
      img: "insurance.png",
      width: 52,
      height: 52,
      name: "Assicurazione",
      description: "Copri il valore: rimborso in caso di smarrimento, furto o danneggiamento.",
      isSelected: false,
      popupIcon: "insurance-icon.png",
      popupDescription: "Indica il valore del contenuto. In caso di smarrimento o danneggiamento durante il trasporto, è possibile richiedere un rimborso secondo le condizioni del servizio.",
    },
    {
      img: "tail-lift.png",
      width: 58,
      height: 55,
      name: "Sponda idraulica",
      description: "Camion con pedana di sollevamento per carico e scarico di colli pesanti.",
      isSelected: false,
      popupDescription:
        "Richiedi il mezzo con sponda per caricare o scaricare quando non è disponibile banchina, muletto o personale di movimentazione. La disponibilità dipende dal corriere e dalla tratta.",
    },
  ]);

  const open = ref(false);
  const isServiceChecked = ref(false);

  const selectedService = ref({
    index: "",
    name: "",
    description: "",
    icon: "",
  });

  const myService = ref(null);
  const myServiceIndex = ref(null);

  // Dati servizi popup (Contrassegno, Assicurazione, etc.)
  const serviceData = ref({
    contrassegno: {
      importo: '',
      cod_payment_method: '',
      modalita_incasso: '',
      modalita_rimborso: '',
      dettaglio_rimborso: ''
    },
    assicurazione: {},
    sponda_idraulica: {
      particolarita_consegna: 'SU',
      note: ''
    },
    telefono_notifica: ''
  });

  // Computed per separare servizio in evidenza dagli altri
  const featuredService = computed(() => servicesList.value.find(s => s.featured));
  const regularServices = computed(() => servicesList.value.filter(s => !s.featured));

  // SMS/Email Notifiche
  const smsEmailNotification = ref(false);

  // Apre il popup di dettaglio per un servizio e lo segna come selezionato
  const chooseService = (service, serviceIndex) => {
    // Servizio "Senza etichetta" (featured) - selezione diretta senza popup
    if (service.featured) {
      const isCurrentlySelected = servicesList.value[serviceIndex].isSelected;
      servicesList.value[serviceIndex].isSelected = !isCurrentlySelected;

      if (!isCurrentlySelected) {
        if (!userStore.servicesArray.includes(service.name)) {
          userStore.servicesArray.push(service.name);
        }
      } else {
        const index = userStore.servicesArray.indexOf(service.name);
        if (index !== -1) {
          userStore.servicesArray.splice(index, 1);
        }
      }

      services.value.service_type = userStore.servicesArray.join(", ");
      return;
    }

    // Per i servizi standard: click su card gia' selezionata = deseleziona subito.
    if (userStore.servicesArray.includes(service.name)) {
      const index = userStore.servicesArray.indexOf(service.name);
      if (index !== -1) userStore.servicesArray.splice(index, 1);
      servicesList.value[serviceIndex].isSelected = false;
      services.value.service_type = userStore.servicesArray.join(", ");
      return;
    }

    // Altri servizi - apri popup
    open.value = true;

    selectedService.value.name = service.name;
    selectedService.value.description = service.popupDescription;
    selectedService.value.index = serviceIndex;
    selectedService.value.icon = service.popupIcon;

    myService.value = service;
    myServiceIndex.value = serviceIndex;
  };

  // Aggiunge o rimuove un servizio dalla lista dei servizi selezionati (toggle)
  const addService = (service = myService.value) => {
    if (!service?.name) {
      open.value = false;
      return;
    }

    const alreadySelected = userStore.servicesArray.includes(service.name);
    if (!alreadySelected) {
      userStore.servicesArray.push(service.name);

      // Salva i dati del servizio nello store per persistenza
      if (service.name === 'Contrassegno') {
        userStore.serviceData = userStore.serviceData || {};
        userStore.serviceData.contrassegno = { ...serviceData.value.contrassegno };
      } else if (service.name === 'Assicurazione') {
        userStore.serviceData = userStore.serviceData || {};
        userStore.serviceData.assicurazione = { ...serviceData.value.assicurazione };
      } else if (service.name === 'Sponda idraulica') {
        userStore.serviceData = userStore.serviceData || {};
        userStore.serviceData.sponda_idraulica = { ...serviceData.value.sponda_idraulica };
      }
    } else {
      const index = userStore.servicesArray.indexOf(service.name);
      if (index !== -1) {
        userStore.servicesArray.splice(index, 1);
      }
    }

    const serviceVisual = servicesList.value.find((s) => s.name === service.name);
    if (serviceVisual) serviceVisual.isSelected = !alreadySelected;

    services.value.service_type = userStore.servicesArray.join(", ");
    open.value = false;
    selectedService.value.index = "";
  };

  const removeServiceFromSidebar = (idx) => {
    const removed = userStore.servicesArray[idx];
    userStore.servicesArray.splice(idx, 1);
    services.value.service_type = userStore.servicesArray.join(", ");
    const svc = servicesList.value.find(s => s.name === removed);
    if (svc) svc.isSelected = false;
  };

  const myClose = () => {
    if (selectedService.value.index !== "" && servicesList.value[selectedService.value.index]) {
      const service = servicesList.value[selectedService.value.index];
      if (!userStore.servicesArray.includes(service.name)) {
        service.isSelected = false;
      }
    }
    open.value = false;
  };

  // Quando il modal viene chiuso dall'esterno (click fuori), deseleziona il servizio
  watch(open, (newVal) => {
    if (!newVal && selectedService.value.index !== "" && servicesList.value[selectedService.value.index]) {
      const service = servicesList.value[selectedService.value.index];
      if (!userStore.servicesArray.includes(service.name)) {
        service.isSelected = false;
      }
    }
  });

  // Ripristina selezione dallo store (chiamato dall'esterno all'init)
  const restoreServicesFromStore = () => {
    if (userStore.pickupDate) {
      services.value.date = userStore.pickupDate;
    }
    if (userStore.servicesArray.length > 0) {
      services.value.service_type = userStore.servicesArray.join(", ");
      servicesList.value.forEach(svc => {
        if (userStore.servicesArray.includes(svc.name)) {
          svc.isSelected = true;
        }
      });
    }
    if (userStore.smsEmailNotification !== undefined) {
      smsEmailNotification.value = userStore.smsEmailNotification;
    }
  };

  return {
    services,
    servicesList,
    serviceData,
    open,
    isServiceChecked,
    selectedService,
    myService,
    myServiceIndex,
    featuredService,
    regularServices,
    smsEmailNotification,
    chooseService,
    addService,
    removeServiceFromSidebar,
    myClose,
    restoreServicesFromStore,
  };
}
