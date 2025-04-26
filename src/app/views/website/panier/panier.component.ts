import { StripeService } from '@/app/core/services/stripe.service'
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  TemplateRef,
  ElementRef,
} from '@angular/core'
import { CommonModule, CurrencyPipe } from '@angular/common'
import { RouterModule, Router } from '@angular/router'
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms'
import { FormsModule } from '@angular/forms'
import {
  NgbAlertModule,
  NgbModal,
  NgbModalModule,
  NgbModalRef,
} from '@ng-bootstrap/ng-bootstrap'
import { PanierService } from '@/app/core/services/panier.service'
import {
  Colis,
  STATUT_COLIS,
  TYPE_EXPEDITION,
  PARAMETRAGE_COLIS,
  Facture,
  Paiement,
  TYPE_PAIEMENT,
} from '@/app/models/partenaire.model'
import { UtilisateurService } from '@/app/core/services/utilisateur.service'
import { Subscription } from 'rxjs'
import {
  AuthModalService,
  AuthModalType,
} from '@/app/core/services/auth-modal.service'
import { AuthModalModule } from '@/app/views/website/components/auth-modal/auth-modal.module'
import { PaymentService } from '@/app/core/services/payment.service'
import { FirebaseService } from '@/app/core/services/firebase.service'
import { currentYear } from '@/app/common/constants'
import { HttpClient } from '@angular/common/http'
import { take } from 'rxjs/operators'

// Types de paiement mobile
enum MOBILE_MONEY_PROVIDER {
  MPESA = 'MPESA',
  ORANGE_MONEY = 'ORANGE_MONEY',
  AIRTEL_MONEY = 'AIRTEL_MONEY'
}

// Interface pour le mode de paiement
interface PaymentMode {
  type: 'CARD' | 'MOBILEMONEY'
  mobileProvider?: MOBILE_MONEY_PROVIDER
  phoneNumber?: string
}

// Interface pour la demande de paiement mobile
interface MobilePaymentRequest {
  order: {
    paymentPageId: string
    customerFullName: string
    customerPhoneNumber: string
    customerEmailAddress: string
    transactionReference: string
    amount: number
    currency: string
    redirectURL: string
  }
  paymentChannel: {
    channel: string
    provider: string
    walletID: string
  }
}

// Réponse de l'API de paiement mobile
interface MobilePaymentResponse {
  transactionId: string
  originatingTransactionId: string
  paymentLink: string
}

@Component({
  selector: 'app-panier',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    NgbAlertModule,
    NgbModalModule,
    AuthModalModule,
    CurrencyPipe,
  ],
  providers: [CurrencyPipe, StripeService],
  templateUrl: './panier.component.html',
  styleUrl: './panier.component.scss',
})
export class PanierComponent implements OnInit, OnDestroy {
  @ViewChild('connexionRequiseModal') connexionRequiseModal!: TemplateRef<any>
  @ViewChild('stripePaymentModal') stripePaymentModal!: TemplateRef<any>
  @ViewChild('cardElement') cardElement?: ElementRef
  @ViewChild('paymentMethodModal') paymentMethodModal!: TemplateRef<any>
  @ViewChild('mobileMoneyModal') mobileMoneyModal!: TemplateRef<any>

  colis: Colis[] = []
  total = 0
  isLoading = false
  errorMessage = ''
  successMessage = ''
  facturationForm!: FormGroup
  isFacturationFormVisible = false
  isProcessing = false
  isCreatingFacture = false
  partenaireId: string | null = null
  utilisateurConnecte: any = null
  private subscription = new Subscription()
  factureCreee: string = ''

  // Variables pour Stripe
  stripe: any
  elements: any
  paymentElement: any
  clientSecret: string = ''
  paymentProcessing = false
  paymentStatus: 'initial' | 'processing' | 'success' | 'error' = 'initial'

  // Ajout de l'état du processus de paiement
  isPaiementEnCours = false

  // Type d'expédition
  readonly TYPE_EXPEDITION = TYPE_EXPEDITION
  selectedExpeditionType: TYPE_EXPEDITION = TYPE_EXPEDITION.EXPRESS

  // Nouvelles propriétés pour la facturation
  currentYear = currentYear
  currentDate = new Date()
  invoiceNumber = `FA${currentYear}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

  // Propriétés pour le paiement mobile money
  selectedPaymentMode: PaymentMode = { type: 'CARD' }
  mobileMoneyProviders = MOBILE_MONEY_PROVIDER
  mobileMoneyForm: FormGroup
  mobilePaymentProcessing = false
  mobilePaymentError = ''
  mobilePaymentSuccess = ''
  readonly MOBILE_API_URL = 'https://araka-api-uat.azurewebsites.net/api/Pay/paymentrequest'

  private modalRef: NgbModalRef | null = null;

  constructor(
    private panierService: PanierService,
    private utilisateurService: UtilisateurService,
    private router: Router,
    private fb: FormBuilder,
    private modalService: NgbModal,
    private authModalService: AuthModalService,
    private paymentService: PaymentService,
    private firebaseService: FirebaseService,
    private stripeService: StripeService,
    private http: HttpClient
  ) {
    // Initialiser le formulaire de facturation
    this.facturationForm = this.fb.group({
      partenaireId: ['', [Validators.required]],
    })

    // Initialiser le formulaire Mobile Money
    this.mobileMoneyForm = this.fb.group({
      provider: [MOBILE_MONEY_PROVIDER.MPESA, Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]]
    });
  }

  ngOnInit(): void {
    this.chargerPanier()
    this.verifierUtilisateurConnecte()
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe()
  }

  private verifierUtilisateurConnecte(): void {
    this.subscription.add(
      this.utilisateurService.utilisateurCourant$.subscribe((utilisateur) => {
        if (utilisateur) {
          this.utilisateurConnecte = utilisateur

          this.partenaireId = utilisateur.partenaireId || null
          if (this.partenaireId) {
            this.facturationForm
              .get('partenaireId')
              ?.setValue(this.partenaireId)
          }
        } else {
          this.utilisateurConnecte = null
          this.partenaireId = null
        }
      })
    )
  }

  private chargerPanier(): void {
    this.isLoading = true
    this.colis = this.panierService.obtenirContenuPanier()
    this.calculerTotal()
    this.isLoading = false
  }

  private calculerTotal(): void {
    this.total = this.panierService.calculerTotal()
  }

  supprimerColis(id: string): void {
    this.panierService.supprimerDuPanier(id)
    this.chargerPanier()
    this.successMessage = 'Colis supprimé du panier'
    setTimeout(() => (this.successMessage = ''), 3000)
  }

  viderPanier(): void {
    this.panierService.viderPanier()
    this.chargerPanier()
    this.successMessage = 'Panier vidé avec succès'
    setTimeout(() => (this.successMessage = ''), 3000)
  }

  getStatutLabel(statut: STATUT_COLIS): string {
    switch (statut) {
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'bg-warning text-dark'
      case STATUT_COLIS.PAYE:
        return 'bg-success'
      case STATUT_COLIS.EN_ATTENTE_EXPEDITION:
        return 'bg-info'
      case STATUT_COLIS.EN_COURS_EXPEDITION:
        return 'bg-primary'
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
        return 'bg-info'
      case STATUT_COLIS.LIVRE:
        return 'bg-success'
      case STATUT_COLIS.ANNULE:
        return 'bg-danger'
      default:
        return 'bg-secondary'
    }
  }

  getStatutText(statut: STATUT_COLIS): string {
    switch (statut) {
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'En attente de paiement'
      case STATUT_COLIS.PAYE:
        return 'Payé'
      case STATUT_COLIS.EN_ATTENTE_EXPEDITION:
        return "En attente d'expédition"
      case STATUT_COLIS.EN_COURS_EXPEDITION:
        return "En cours d'expédition"
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
        return 'En attente de livraison'
      case STATUT_COLIS.LIVRE:
        return 'Livré'
      case STATUT_COLIS.ANNULE:
        return 'Annulé'
      default:
        return 'Statut inconnu'
    }
  }

  getTypeExpeditionLabel(type: TYPE_EXPEDITION): string {
    switch (type) {
      case TYPE_EXPEDITION.EXPRESS:
        return 'Express'
      case TYPE_EXPEDITION.STANDARD:
        return 'Standard'
      default:
        return 'Inconnu'
    }
  }

  annulerFacturation(): void {
    this.isFacturationFormVisible = false
    this.facturationForm.reset()
    if (this.partenaireId) {
      this.facturationForm.get('partenaireId')?.setValue(this.partenaireId)
    }
  }

  // Méthode appelée lors du changement du type d'expédition
  onExpeditionTypeChange(): void {
    // Recalculer les coûts pour chaque colis en fonction du type d'expédition
    for (const colis of this.colis) {
      if (colis.id) {
        // Calculer le nouveau coût du colis basé sur le type d'expédition
        const typeColis = colis.type
        const poids = colis.poids || 0
        const quantite = Number(colis.quantite) || 1 // Convertir en nombre

        // Récupérer les tarifs correspondants
        const parametrage =
          PARAMETRAGE_COLIS[this.selectedExpeditionType][typeColis]

        // Calculer le coût
        let nouveauCout = parametrage.prixParKilo * poids
        if (parametrage.prixUnitaire) {
          nouveauCout += parametrage.prixUnitaire * quantite
        }

        // Mettre à jour le colis
        colis.cout = Math.round(nouveauCout)
        colis.typeExpedition = this.selectedExpeditionType
      }
    }

    // Mettre à jour le panier pour persister les changements
    this.panierService.viderPanier()
    for (const colis of this.colis) {
      this.panierService.ajouterAuPanier(colis)
    }

    // Mettre à jour le total
    this.calculerTotal()

    // Informer l'utilisateur du changement
    this.successMessage = `Type d'expédition modifié pour ${this.selectedExpeditionType === TYPE_EXPEDITION.EXPRESS ? 'Express' : 'Standard'}`
    setTimeout(() => (this.successMessage = ''), 3000)
  }

  // Méthode pour créer la facture
  private async createFacture(): Promise<string> {
    if (!this.utilisateurConnecte || !this.utilisateurConnecte.partenaireId) {
      throw new Error('Utilisateur non connecté ou partenaireId non disponible')
    }

    this.colis = this.panierService.obtenirContenuPanier()

    // Mise à jour du type d'expédition pour chaque colis si nécessaire
    if (this.selectedExpeditionType) {
      this.colis.forEach((colis) => {
        colis.typeExpedition = this.selectedExpeditionType
      })
    }

    // Générer un numéro de facture unique
    const invoiceNumber = `FA${currentYear}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

    const colisData: Colis[] = []
    this.colis.forEach((data) => {

      const colis: Colis = {
        id: data.id,
        type: data.type,
        partenaireId: this.partenaireId || '',
        clientNom:this.utilisateurConnecte.nom,
        clientPrenom: this.utilisateurConnecte.prenom,
        clientTelephone: this.utilisateurConnecte.telephone,
        clientEmail: this.utilisateurConnecte.email,
        statut: data.statut,
        typeExpedition: data.typeExpedition,
        description: data.description,
        poids: data.poids,
        cout: data.cout,
        dateCreation: data.dateCreation,
        codeSuivi: data.codeSuivi,
        nombreUnites: data.nombreUnites? data.nombreUnites :Number( data.quantite),
        codeexpedition: data.codeexpedition,
        destinataire: data.destinataire,
        destination: data.destination,
        quantite: data.quantite,
        nature: data.nature,
        transporteur: data.transporteur,
      }
      colisData.push(colis)


    })


    // Créer l'objet facture avec l'ID personnalisé
    const facture: Omit<Facture, 'id'> & { id: string } = {
      id: invoiceNumber,
      montant: this.total,
      montantPaye: 0,
      colis: colisData,
      paiements: [],
      dateCreation: new Date().toISOString(),
      partenaireId: this.utilisateurConnecte.partenaireId,
    }

    await this.firebaseService.createFacture(facture)
    return facture.id
  }

  // Méthode pour mettre à jour le statut des colis
  private async updateColisStatus(factureId: string): Promise<void> {
    const updatePromises = this.colis
      .filter((colis) => colis.id)
      .map((colis) =>
        this.firebaseService.updateColis(colis.id!, {
          statut: STATUT_COLIS.AU_PANIER,
          typeExpedition: this.selectedExpeditionType,
        })
      )

    await Promise.all(updatePromises)
  }
  async creerFacture(): Promise<void> {
    try {
      this.isProcessing = true;
      this.isCreatingFacture = true;
      this.errorMessage = '';
      this.successMessage = '';

      // Vérifier si l'utilisateur est connecté
      const utilisateur = this.utilisateurConnecte;
      if (!utilisateur || !utilisateur.partenaireId) {
        this.isProcessing = false;
        this.isCreatingFacture = false;
        this.ouvrirModalConnexion();
        return;
      }

      // Créer la facture depuis le panier
      this.factureCreee = await this.createFacture();

      if (this.factureCreee) {
        // Mettre à jour le statut des colis
        await this.updateColisStatus(this.factureCreee);

        // Vider le panier après création de la facture pour éviter les doublons
        this.panierService.viderPanier();

        // Ouvrir le modal de sélection de méthode de paiement
        this.openPaymentMethodModal();

        this.successMessage = 'Votre facture a été créée avec succès.';
      } else {
        this.errorMessage = 'Une erreur est survenue lors de la création de la facture.';
      }
    } catch (error) {
      console.error('Erreur lors de la création de la facture:', error);
      this.errorMessage = 'Une erreur est survenue lors de la création de la facture.';
    } finally {
      this.isProcessing = false;
      this.isCreatingFacture = false;
    }
  }

  // Initialiser les éléments de paiement Stripe
  async initializeStripePayment(factureId: string): Promise<void> {
    try {
      // Calculer les frais de transaction (10%)
      const montantBase = Number(this.total);
      const commission = montantBase * 0.1;
      const totalAvecCommission = montantBase + commission;

      // Obtenir le client secret via notre API
      this.clientSecret = await this.stripeService.createPaymentIntent(
        totalAvecCommission
      );

      // Obtenir l'instance de Stripe
      this.stripe = await this.stripeService.getStripeInstance();

      // Créer les éléments Stripe
      this.elements = this.stripe.elements({
        clientSecret: this.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#007bff',
          },
        },
      });

      // Créer l'élément de paiement
      this.paymentElement = this.elements.create('payment', {
        amount: {
          currency: 'usd',
          value: totalAvecCommission * 100, // Stripe attend les montants en centimes
        }
      });

      // Monter l'élément de paiement dans le DOM
      setTimeout(() => {
        if (this.cardElement?.nativeElement) {
          this.paymentElement.mount(this.cardElement.nativeElement);
        }
      }, 100);

      this.isProcessing = false
    } catch (error) {
      console.error("Erreur lors de l'initialisation de Stripe:", error)
      this.errorMessage =
        "Erreur lors de l'initialisation du système de paiement"
      this.isProcessing = false
      throw error
    }
  }

  // Traiter le paiement
  async processPayment(): Promise<void> {
    if (!this.stripe || !this.elements) {
      this.errorMessage = "Le système de paiement n'est pas initialisé"
      return
    }

    this.paymentProcessing = true
    this.paymentStatus = 'processing'

    try {
      // D'abord soumettre les éléments
      const { error: submitError } = await this.elements.submit()
      if (submitError) {
        this.paymentStatus = 'error'
        this.errorMessage =
          submitError.message ||
          'Erreur lors de la validation du formulaire de paiement'
        this.paymentProcessing = false
        return
      }

      // Ensuite confirmer le paiement
      const { error, paymentIntent } = await this.stripe.confirmPayment({
        elements: this.elements,
        clientSecret: this.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/mes-commandes`,
        },
        redirect: 'if_required',
      })
      console.log("paymentIntent 1 ---------------********************",paymentIntent,error);

      if (error) {
        this.paymentStatus = 'error'
        this.errorMessage =
          error.message || 'Une erreur est survenue lors du paiement'

        // Rediriger vers mes-commandes même en cas d'erreur
        setTimeout(() => {
          this.router.navigate(['/mes-commandes']);
        }, 1500);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        this.paymentStatus = 'success'
        this.successMessage = 'Paiement effectué avec succès!'
        console.log("paymentIntent ---------------********************",paymentIntent);

        // Créer un paiement avec un ID unique pour la facture créée
        if (this.factureCreee) {
          // Calculer la commission (10%)
          const commission = this.total * 0.1;
          console.log("paymentIntent ---------------********************",paymentIntent);


          const paiementId = `PAY${new Date().getTime()}`
          const paiement: Paiement = {
            id: paiementId,
            typepaiement: TYPE_PAIEMENT.CARTE,
            montant_paye: this.total,
            facture_reference: this.factureCreee,
            id_facture: this.factureCreee,
            datepaiement: new Date(),
            stripe_reference: paymentIntent.id, // Ajouter la référence de la transaction Stripe
            commission: commission // Ajouter la commission de 10%
          }

          try {
            // Ajouter le paiement à la collection paiements
            await this.firebaseService.addPaiement(paiement);

            // Mettre à jour la facture avec le nouveau paiement
            await this.firebaseService.updateFacture(this.factureCreee, {
              montantPaye: this.total,
              paiements: [paiement],
            })

            // Mettre à jour le statut des colis
            for (const colis of this.colis) {
              if (colis.id) {
                await this.firebaseService.updateColis(colis.id, {
                  statut: STATUT_COLIS.PAYE,
                })
              }
            }
          } catch (err) {
            console.error('Erreur lors de la mise à jour après paiement:', err)
            this.errorMessage =
              'Le paiement a réussi mais une erreur est survenue lors de la mise à jour. Veuillez contacter le support.'
          }
        }

        // Fermer le modal
        this.modalService.dismissAll()

        // Rediriger vers la page de confirmation
        setTimeout(() => {
          this.router.navigate(['/mes-commandes'])
        }, 1500)
      }
    } catch (error: any) {
      this.paymentStatus = 'error'
      this.errorMessage =
        error.message || 'Une erreur est survenue lors du paiement'

      // Rediriger vers mes-commandes même en cas d'erreur
      setTimeout(() => {
        this.router.navigate(['/mes-commandes']);
      }, 1500);
    } finally {
      this.paymentProcessing = false
    }
  }

  // Annuler le paiement
  cancelPayment(): void {
    this.modalService.dismissAll()
    this.paymentStatus = 'initial'
    this.paymentElement?.unmount()
    this.elements = null
    this.paymentElement = null

    // Rediriger vers la page des commandes car la facture a déjà été créée
    this.router.navigate(['/mes-commandes'])
  }

  confirmerSuppression(modal: any, colisId: string): void {
    this.modalService.open(modal, { centered: true }).result.then((result) => {
      if (result === 'confirm') {
        this.supprimerColis(colisId)
      }
    })
  }

  // Méthodes pour ouvrir les modals d'authentification
  ouvrirModalConnexion(): void {
    this.authModalService.openAuthModal(AuthModalType.LOGIN)
  }

  ouvrirModalInscription(): void {
    this.authModalService.openAuthModal(AuthModalType.REGISTER)
  }

  // Sélectionner le mode de paiement
  selectPaymentMode(mode: 'CARD' | 'MOBILEMONEY'): void {
    this.selectedPaymentMode = { type: mode };

    if (mode === 'CARD') {
      this.modalRef?.close();
      this.initializeStripePayment(this.factureCreee);
    } else {
      this.modalRef?.close();
      this.openMobileMoneyModal();
    }
  }

  // Ouvrir modal de sélection du mode de paiement
  openPaymentMethodModal(): void {
    this.modalRef = this.modalService.open(this.paymentMethodModal, { centered: true });

    // Ajouter un gestionnaire pour la fermeture du modal
    this.modalRef.result.then(
      (result) => {
        // Modal fermé par une action (comme choisir une méthode de paiement)
        // La logique est gérée par les autres méthodes
      },
      (reason) => {
        // Modal fermé par croix ou clic à l'extérieur
        // Rediriger vers mes-commandes car la facture a déjà été créée
        this.router.navigate(['/mes-commandes']);
      }
    );
  }

  // Ouvrir modal de paiement mobile money
  openMobileMoneyModal(): void {
    this.modalRef = this.modalService.open(this.mobileMoneyModal, { centered: true });

    // Ajouter un gestionnaire pour la fermeture du modal
    this.modalRef.result.then(
      (result) => {
        // Modal fermé par une action (comme soumettre le paiement)
        // La logique est gérée par les autres méthodes
      },
      (reason) => {
        // Modal fermé par croix ou clic à l'extérieur
        // Rediriger vers mes-commandes car la facture a déjà été créée
        this.router.navigate(['/mes-commandes']);
      }
    );

    // Surveillance des changements de fournisseur pour les validations spécifiques
    this.mobileMoneyForm.get('provider')?.valueChanges.subscribe(provider => {
      const phoneControl = this.mobileMoneyForm.get('phoneNumber');
      phoneControl?.setValidators([Validators.required, Validators.pattern(/^[0-9]{9}$/)]);
      phoneControl?.updateValueAndValidity();
    });
  }

  // Vérifier si le numéro de téléphone est valide pour le fournisseur sélectionné
  isValidPhoneForProvider(provider: MOBILE_MONEY_PROVIDER, phone: string): boolean {
    if (!phone || phone.length !== 9) return false;

    const prefix = phone.substring(0, 2);

    switch (provider) {
      case MOBILE_MONEY_PROVIDER.MPESA:
        return ['81', '82', '83'].includes(prefix);
      case MOBILE_MONEY_PROVIDER.ORANGE_MONEY:
        return ['84', '85', '89'].includes(prefix);
      case MOBILE_MONEY_PROVIDER.AIRTEL_MONEY:
        return ['99', '97'].includes(prefix);
      default:
        return false;
    }
  }

  // Obtenir le préfixe valide pour le fournisseur
  getValidPrefixesForProvider(provider: MOBILE_MONEY_PROVIDER): string {
    switch (provider) {
      case MOBILE_MONEY_PROVIDER.MPESA:
        return '81, 82, 83';
      case MOBILE_MONEY_PROVIDER.ORANGE_MONEY:
        return '84, 85, 89';
      case MOBILE_MONEY_PROVIDER.AIRTEL_MONEY:
        return '99, 97';
      default:
        return '';
    }
  }

  // Méthode pour obtenir les informations de l'utilisateur actuel de manière fiable
  private async getUtilisateurCourantInfo(): Promise<any> {
    // Vérifier d'abord si nous avons déjà les informations
    if (this.utilisateurConnecte && this.utilisateurConnecte.id) {
      return this.utilisateurConnecte;
    }

    // Essayer de récupérer les informations directement depuis le service
    try {
      const userFromService = await this.utilisateurService.getCurrentUser();
      if (userFromService) {
        this.utilisateurConnecte = userFromService;
        return userFromService;
      }

      // Si cela ne fonctionne pas, essayer via l'observable
      const userFromObservable = await this.utilisateurService.utilisateurCourant$.pipe(take(1)).toPromise();
      if (userFromObservable) {
        this.utilisateurConnecte = userFromObservable;
        return userFromObservable;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération utilisateur:', error);
    }

    // Dernier recours: vérifier dans le localStorage
    const storedUser = localStorage.getItem('utilisateur_courant');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.id) {
          this.utilisateurConnecte = parsedUser;
          return parsedUser;
        }
      } catch (e) {
        console.error('Erreur lors du parsing utilisateur depuis localStorage:', e);
      }
    }

    // Si aucune méthode ne fonctionne, lancer une erreur
    throw new Error('Utilisateur non connecté ou impossible de récupérer les informations');
  }

  // Soumettre le paiement par mobile money
  async submitMobilePayment(): Promise<void> {
    if (this.mobileMoneyForm.invalid) {
      this.mobileMoneyForm.markAllAsTouched();
      return;
    }

    if (!this.factureCreee) {
      this.mobilePaymentError = 'Facture non créée';
      return;
    }

    const provider = this.mobileMoneyForm.get('provider')!.value;
    const phoneNumber = this.mobileMoneyForm.get('phoneNumber')!.value;

    // Vérifier si le numéro est valide pour le fournisseur
    if (!this.isValidPhoneForProvider(provider, phoneNumber)) {
      this.mobilePaymentError = `Numéro invalide pour ${provider}. Le numéro doit commencer par ${this.getValidPrefixesForProvider(provider)}.`;
      return;
    }

    this.mobilePaymentProcessing = true;
    this.mobilePaymentError = '';

    try {
      const montantBase = Number(this.total);
      const commission = montantBase * 0.1;
      const totalAvecCommission = montantBase + commission;

      // Récupérer les informations de l'utilisateur de manière fiable
      let user;
      try {
        user = await this.getUtilisateurCourantInfo();
      } catch (error) {
        this.mobilePaymentError = 'Veuillez vous connecter pour effectuer ce paiement.';
        this.mobilePaymentProcessing = false;
        return;
      }

      // Préparer les informations client
      const customerName = `${user.nom || ''} ${user.prenom || ''}`.trim() || 'Client';
      const customerEmail = user.email || '';

      // Créer la référence unique pour la transaction
      const transactionReference = `MB-PANIER-${Date.now()}-${this.factureCreee}`;

      // Préparer la requête pour l'API de paiement mobile
      const paymentRequest: MobilePaymentRequest = {
        order: {
          paymentPageId: "BF139283-5051-4AFB-A714-D431BA158564", // À remplacer par votre ID de page de paiement
          customerFullName: customerName,
          customerPhoneNumber: `+243${phoneNumber}`,
          customerEmailAddress: customerEmail,
          transactionReference: transactionReference,
          amount: totalAvecCommission,
          currency: "USD",
          redirectURL: `${window.location.origin}/mes-commandes` // URL de redirection après paiement
        },
        paymentChannel: {
          channel: "MOBILEMONEY",
          provider: provider,
          walletID: `+243${phoneNumber}`
        }
      };

      console.log('Envoi de la requête de paiement mobile:', paymentRequest);

      // Appeler l'API de paiement mobile
      const response = await this.http.post<MobilePaymentResponse>(
        this.MOBILE_API_URL,
        paymentRequest
      ).toPromise();

      if (response && response.paymentLink) {
        // Enregistrer les informations de paiement dans Firestore
        await this.enregistrerPaiementMobile(
          transactionReference,
          totalAvecCommission,
          commission,
          provider,
          phoneNumber
        );

        // Rediriger vers le lien de paiement fourni par l'API
        this.mobilePaymentSuccess = 'Redirection vers la page de paiement...';

        // Rediriger vers la page de paiement mobile
        window.location.href = response.paymentLink;
      } else {
        throw new Error('Réponse de paiement invalide');
      }
    } catch (error) {
      console.error('Erreur lors du paiement mobile:', error);
      this.mobilePaymentError = `Erreur lors du paiement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;

      // Rediriger vers mes-commandes même en cas d'erreur
      setTimeout(() => {
        this.router.navigate(['/mes-commandes']);
      }, 1500);
    } finally {
      this.mobilePaymentProcessing = false;
    }
  }

  // Enregistrer les informations du paiement mobile
  async enregistrerPaiementMobile(
    reference: string,
    montant: number,
    commission: number,
    provider: string,
    phoneNumber: string
  ): Promise<void> {
    if (!this.factureCreee) {
      throw new Error('Facture non valide');
    }

    // Convertir le fournisseur mobile en type de paiement
    let typePaiement;
    switch (provider) {
      case MOBILE_MONEY_PROVIDER.MPESA:
        typePaiement = TYPE_PAIEMENT.MPESA;
        break;
      case MOBILE_MONEY_PROVIDER.ORANGE_MONEY:
        typePaiement = TYPE_PAIEMENT.ORANGE_MONEY;
        break;
      case MOBILE_MONEY_PROVIDER.AIRTEL_MONEY:
        typePaiement = TYPE_PAIEMENT.AIRTEL_MONEY;
        break;
      default:
        typePaiement = TYPE_PAIEMENT.ESPECE;
    }

    // Créer l'objet paiement
    const paiement = {
      id: reference,
      typepaiement: typePaiement,
      montant_paye: montant - commission,
      facture_reference: this.factureCreee,
      id_facture: this.factureCreee,
      datepaiement: new Date(),
      stripe_reference: reference,
      commission: commission
    };

    // Enregistrer le paiement en attente
    await this.firebaseService.addPaiementToFacture(
      this.factureCreee,
      paiement
    );
  }
}
