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

  colis: Colis[] = []
  total = 0
  isLoading = false
  errorMessage = ''
  successMessage = ''
  facturationForm!: FormGroup
  isFacturationFormVisible = false
  isProcessing = false
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

  constructor(
    private panierService: PanierService,
    private utilisateurService: UtilisateurService,
    private router: Router,
    private fb: FormBuilder,
    private modalService: NgbModal,
    private authModalService: AuthModalService,
    private paymentService: PaymentService,
    private firebaseService: FirebaseService,
    private stripeService: StripeService
  ) {}

  ngOnInit(): void {
    this.chargerPanier()
    this.initFacturationForm()
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
          console.log('utilisateur', utilisateur)
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

  private initFacturationForm(): void {
    this.facturationForm = this.fb.group({
      partenaireId: ['', [Validators.required]],
    })
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

      console.log(colis,this.utilisateurConnecte);
      
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
          statut: STATUT_COLIS.EN_ATTENTE_PAIEMENT,
          typeExpedition: this.selectedExpeditionType,
        })
      )

    await Promise.all(updatePromises)
  }
  async creerFacture(): Promise<void> {
    if (!this.utilisateurConnecte) {
      this.errorMessage = 'Veuillez vous connecter pour poursuivre le paiement'
      this.ouvrirModalConnexion()
      return
    }

    if (
      !this.utilisateurConnecte.nom ||
      !this.utilisateurConnecte.prenom ||
      !this.utilisateurConnecte.telephone
    ) {
      this.errorMessage = 'Veuillez compléter votre profil pour pouvoir payer'
      this.router.navigate(['/profil'])
      return
    }

    if (this.facturationForm.invalid) {
      this.facturationForm.markAllAsTouched()
      return
    }

    this.isProcessing = true
    this.errorMessage = ''

    try {
      // Créer la facture
      const factureId = await this.createFacture()
      this.factureCreee = factureId

      // Mettre à jour le statut des colis
      await this.updateColisStatus(factureId)

      // Initialiser le paiement Stripe
      await this.initializeStripePayment(factureId)

      // Ouvrir le modal de paiement Stripe
      this.modalService.open(this.stripePaymentModal, {
        centered: true,
        backdrop: 'static',
      })
    } catch (error) {
      console.error('Erreur lors de la préparation du paiement:', error)
      this.errorMessage =
        'Une erreur est survenue lors de la préparation du paiement'
      this.isProcessing = false
    }
  }

  // Initialiser les éléments de paiement Stripe
  async initializeStripePayment(factureId: string): Promise<void> {
    try {
      // Obtenir le client secret via notre API
      this.clientSecret = await this.stripeService.createPaymentIntent(
        this.total
      )

      // Obtenir l'instance de Stripe
      this.stripe = await this.stripeService.getStripeInstance()

      // Créer les éléments Stripe
      this.elements = this.stripe.elements({
        clientSecret: this.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#007bff',
          },
        },
      })

      // Créer l'élément de paiement
      this.paymentElement = this.elements.create('payment')

      // Monter l'élément de paiement dans le DOM
      setTimeout(() => {
        if (this.cardElement?.nativeElement) {
          this.paymentElement.mount(this.cardElement.nativeElement)
        }
      }, 100)

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

      if (error) {
        this.paymentStatus = 'error'
        this.errorMessage =
          error.message || 'Une erreur est survenue lors du paiement'
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        this.paymentStatus = 'success'
        this.successMessage = 'Paiement effectué avec succès!'

        // Créer un paiement avec un ID unique pour la facture créée
        if (this.factureCreee) {
          const paiementId = `PAY${new Date().getTime()}`
          const paiement: Paiement = {
            id: paiementId,
            typepaiement: TYPE_PAIEMENT.CARTE,
            montant_paye: this.total,
            facture_reference: this.factureCreee,
            id_facture: this.factureCreee,
            datepaiement: new Date(),
          }

          try {
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

        this.panierService.viderPanier()

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
}
