import { Component, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FirebaseService } from '@/app/core/services/firebase.service'
import { Facture, Partenaire, Colis } from '@/app/models/partenaire.model'
import { Router, ActivatedRoute } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { firstValueFrom } from 'rxjs'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { FactureDetailsModalComponent } from '../components/facture-details-modal/facture-details-modal.component'
import { FacturePaiementModalComponent } from '../components/facture-paiement-modal/facture-paiement-modal.component'
import { NotificationService } from '@/app/core/services/notification.service'
import { NotificationButtonComponent } from '../components/notification-button/notification-button.component'

@Component({
  selector: 'app-facture-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationButtonComponent],
  templateUrl: './facture-list.component.html',
  styleUrl: './facture-list.component.scss',
})
export class FactureListComponent implements OnInit {
  factures = signal<Facture[]>([])
  filteredFactures = signal<Facture[]>([])
  isLoading = signal(false)
  searchTerm = ''
  partenaires = new Map<string, Partenaire>()

  // Alerte suite à la création d'une facture
  successMessage = ''
  showAlert = false

  // Suivi des notifications en cours d'envoi (par ID de facture)
  notificationInProgress = new Set<string>()

  constructor(
    private firebaseService: FirebaseService,
    private router: Router,
    private route: ActivatedRoute,
    private modalService: NgbModal,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Vérifier si on a un message de succès depuis la création d'une facture
    this.route.queryParams.subscribe((params) => {
      const successParam = params['success']
      if (
        successParam &&
        successParam.toString() === 'true' &&
        params['message']
      ) {
        this.successMessage = params['message']
        this.showAlert = true

        // Masquer l'alerte après 5 secondes
        setTimeout(() => {
          this.showAlert = false
        }, 5000)
      }
    })

    this.loadFactures()
  }

  async loadFactures(): Promise<void> {
    this.isLoading.set(true)
    try {
      // Charger les factures
      const facturesData = await firstValueFrom(
        this.firebaseService.getFactures()
      )

      // Traitement des factures pour convertir les IDs de colis en objets
      const processedFactures: Facture[] = [];
      if (facturesData && facturesData.length > 0) {
        for (const facture of facturesData) {
          const processedFacture = { ...facture };

          // Convertir les IDs de colis en objets
          if (facture.colis && facture.colis.length > 0) {
            const processedColis: Colis[] = [];

            for (const colis of facture.colis) {
              if (typeof colis === 'string') {
                try {
                  const colisObj = await this.firebaseService.getColisById(colis);
                  if (colisObj) {
                    processedColis.push(colisObj);
                  }
                } catch (error) {
                  console.error(`Erreur lors du chargement du colis ${colis}:`, error);
                }
              } else {
                processedColis.push(colis);
              }
            }

            // Conserver les colis originaux et ajouter les colis objets
            processedFacture.colisObjets = processedColis;
          } else {
            processedFacture.colisObjets = [];
          }

          processedFactures.push(processedFacture);
        }
      }

      this.factures.set(processedFactures || []);
      this.filteredFactures.set(processedFactures || []);

      // Charger les partenaires pour afficher leurs informations
      const partenairesData = await firstValueFrom(
        this.firebaseService.getPartenaires()
      )

      // Créer un Map pour un accès facile aux partenaires
      partenairesData?.forEach((partenaire) => {
        if (partenaire.id) {
          this.partenaires.set(partenaire.id, partenaire)
        }
      })
    } catch (error) {
      console.error('Erreur lors du chargement des factures:', error)
    } finally {
      this.isLoading.set(false)
    }
  }

  // Vérifie si un élément est un objet Colis ou une chaîne ID
  isColisDynamic(colis: any): colis is (any & { partenaireId?: string; clientNom?: string; clientPrenom?: string; clientTelephone?: number }) {
    return typeof colis !== 'string' && colis !== null && typeof colis === 'object';
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredFactures.set(this.factures())
      return
    }

    const term = this.searchTerm.toLowerCase()
    const filtered = this.factures().filter((facture) => {
      // Recherche par ID de facture
      const idMatch = facture.id?.toLowerCase().includes(term)

      // Recherche par montant
      const montantMatch = facture.montant.toString().includes(term)

      // Recherche par client (si on a accès aux informations du client)
      let clientMatch = false
      if (facture.colisObjets && facture.colisObjets.length > 0) {
        const colis = facture.colisObjets[0]
        const partenaireId = colis.partenaireId
        if (partenaireId) {
          const partenaire = this.partenaires.get(partenaireId)
          if (partenaire) {
            clientMatch =
              partenaire.nom.toLowerCase().includes(term) ||
              (partenaire.prenom
                ? partenaire.prenom.toLowerCase().includes(term)
                : false)
          }
        }
      }

      return idMatch || montantMatch || clientMatch
    })

    this.filteredFactures.set(filtered)
  }

  resetSearch(): void {
    this.searchTerm = ''
    this.filteredFactures.set(this.factures())
  }

  viewFactureDetails(factureId: string): void {
    // Ouvrir le modal de détails au lieu de naviguer vers une autre page
    const modalRef = this.modalService.open(FactureDetailsModalComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    })
    modalRef.componentInstance.factureId = factureId
  }

  nouveauPaiement(factureId: string): void {
    // Trouver la facture et le client
    const facture = this.factures().find((f) => f.id === factureId)
    if (!facture) return

    let partenaireId: string | undefined;
    if (facture.colisObjets && facture.colisObjets.length > 0) {
      const colis = facture.colisObjets[0];
      partenaireId = colis.partenaireId;
    }

    const client = partenaireId ? this.partenaires.get(partenaireId) : null

    // Ouvrir le modal de paiement
    const modalRef = this.modalService.open(FacturePaiementModalComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    })

    // Passer les données au modal
    modalRef.componentInstance.factureId = factureId
    modalRef.componentInstance.facture = facture
    modalRef.componentInstance.client = client

    // Écouter les événements du modal
    modalRef.result.then(
      (result) => {
        if (result === 'success') {
          this.successMessage = 'Le paiement a été effectué avec succès!'
          this.showAlert = true
          // Recharger les factures pour les mettre à jour
          this.loadFactures()

          // Masquer l'alerte après 5 secondes
          setTimeout(() => {
            this.showAlert = false
          }, 5000)
        }
      },
      () => {} // Dismissed
    )
  }

  imprimerFacture(factureId: string): void {
    const modalRef = this.modalService.open(FactureDetailsModalComponent, {
      size: 'lg',
      centered: true,
    })
    modalRef.componentInstance.factureId = factureId
    modalRef.componentInstance.printOnOpen = true
  }

  createNewFacture(): void {
    this.router.navigate(['/facture/new'])
  }

  // Calcule le pourcentage payé d'une facture
  getPaymentPercentage(facture: Facture): number {
    if (facture.montant === 0) return 100
    return (facture.montantPaye / facture.montant) * 100
  }

  // Détermine la classe CSS pour la barre de progression
  getProgressBarClass(percentage: number): string {
    if (percentage >= 100) return 'bg-success'
    if (percentage >= 75) return 'bg-info'
    if (percentage >= 50) return 'bg-warning'
    return 'bg-danger'
  }

  // Obtient le statut de paiement en texte
  getPaymentStatus(facture: Facture): string {
    const percentage = this.getPaymentPercentage(facture)
    if (percentage >= 100) return 'Payée'
    if (percentage > 0) return 'Partiellement payée'
    return 'Non payée'
  }

  // Obtient le nom du client de la facture
  getClientName(facture: Facture): string {
    if (!facture.colisObjets || facture.colisObjets.length === 0) {
      return 'Client inconnu'
    }

    const colis = facture.colisObjets[0]
    const partenaireId = colis.partenaireId
    const partenaire = partenaireId ? this.partenaires.get(partenaireId) : null

    if (partenaire) {
      return `${partenaire.nom} ${partenaire.prenom || ''}`
    }

    return `${colis.clientNom} ${colis.clientPrenom || ''}`
  }

  /**
   * Vérifie si une notification est en cours d'envoi pour une facture spécifique
   */
  isNotificationInProgress(factureId: string): boolean {
    return this.notificationInProgress.has(factureId)
  }

  /**
   * Envoie une notification WhatsApp au client pour l'informer que sa facture est prête
   */
  async envoyerNotification(factureId: string): Promise<void> {
    // Vérifier si une notification est déjà en cours pour cette facture
    if (this.notificationInProgress.has(factureId)) return

    // Trouver la facture et le client
    const facture = this.factures().find((f) => f.id === factureId)
    if (!facture) return

    // Vérifier que la facture n'est pas entièrement payée
    const percentagePaid = this.getPaymentPercentage(facture)
    if (percentagePaid >= 100) {
      this.successMessage = 'Cette facture est déjà entièrement payée.'
      this.showAlert = true
      setTimeout(() => {
        this.showAlert = false
      }, 5000)
      return
    }

    // Marquer cette facture comme étant en cours de notification
    this.notificationInProgress.add(factureId)

    try {
      // Obtenir les informations du client
      let phoneNumber = ''
      let clientName = ''

      if (facture.colisObjets && facture.colisObjets.length > 0) {
        const colis = facture.colisObjets[0]
        const partenaireId = colis.partenaireId

        if (partenaireId) {
          const partenaire = this.partenaires.get(partenaireId)
          if (partenaire) {
            phoneNumber = String(partenaire.telephone)
            clientName = `${partenaire.nom} ${partenaire.prenom || ''}`
          } else {
            phoneNumber = String(colis.clientTelephone)
            clientName = `${colis.clientNom} ${colis.clientPrenom || ''}`
          }
        } else {
          phoneNumber = String(colis.clientTelephone)
          clientName = `${colis.clientNom} ${colis.clientPrenom || ''}`
        }
      }

      // Vérifier que le numéro de téléphone est valide
      if (!phoneNumber) {
        throw new Error('Numéro de téléphone du client introuvable')
      }

      // Formater le numéro de téléphone si nécessaire
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = `+${phoneNumber}`
      }

      // Envoyer la notification
      console.log(phoneNumber,facture);

      const response = await firstValueFrom(
        this.notificationService.sendFactureNotification(
          phoneNumber,
          factureId,
          facture.montant
        )
      )

     // console.log('Notification WhatsApp envoyée:', response)

      this.successMessage = `Notification WhatsApp envoyée avec succès à ${clientName}`
      this.showAlert = true
      setTimeout(() => { this.showAlert = false }, 5000)
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error)
      this.successMessage = 'Erreur lors de l\'envoi de la notification WhatsApp'
      this.showAlert = true
      setTimeout(() => { this.showAlert = false }, 5000)
    } finally {
      // Retirer cette facture de la liste des notifications en cours
      this.notificationInProgress.delete(factureId)
    }
  }
}
