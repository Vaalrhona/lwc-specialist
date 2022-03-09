import { LightningElement, wire, api } from 'lwc';
import getBoats from '@salesforce/apex/BoatDataService.getBoats';
import updateBoatList from '@salesforce/apex/BoatDataService.updateBoatList';
import { publish, subscribe, MessageContext } from 'lightning/messageService';
import BOATMC from '@salesforce/messageChannel/BoatMessageChannel__c';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const SUCCESS_TITLE = 'Success';
const MESSAGE_SHIP_IT = 'Ship it!';
const SUCCESS_VARIANT = 'success';
const ERROR_TITLE   = 'Error';
const ERROR_VARIANT = 'error';

export default class BoatSearchResults extends LightningElement {
    selectedBoatId;
    columns = [];
    @api boatTypeId = '';
    boats;
    isLoading = false;
    subscription = null;
    columns = [
        {label: 'Name', fieldName: 'Name', editable: true},
        {label: 'Length', fieldName: 'Length__c', editable: true},
        {label: 'Price', fieldName: 'Price__c', editable: true},
        {label: 'Description', fieldName:'Description__c', editable: true}
    ]

    @wire(MessageContext)messageContext;

    // wired getBoats method
    @wire(getBoats, {boatTypeId: '$boatTypeId'}) 
    wiredBoats(result) { 
        if(result.data){
            this.boats = result;
        }
    }
    
    // public function that updates the existing boatTypeId property
    // uses notifyLoading
    @api searchBoats(boatTypeId) {
        this.isLoading = true;
        this.notifyLoading(this.isLoading);
        this.boatTypeId = boatTypeId;
     }
    
    // this public function must refresh the boats asynchronously
    // uses notifyLoading
    @api async refresh() {
        this.notifyLoading(true);
        refreshApex(this.boats)
        .then(() => {
            this.notifyLoading(false);
        });
     }
    
    // this function must update selectedBoatId and call sendMessageService
    updateSelectedTile(event) {
        this.selectedBoatId = event.detail.boatId;
        this.sendMessageService(this.selectedBoatId);
     }
    
    // Publishes the selected boat Id on the BoatMC.
    sendMessageService(boatId) { 
        const selectedBoatId = { recordId: boatId };
        publish(this.messageContext, BOATMC, selectedBoatId);
      // explicitly pass boatId to the parameter recordId
    }
    
    // The handleSave method must save the changes in the Boat Editor
    // passing the updated fields from draftValues to the 
    // Apex method updateBoatList(Object data).
    // Show a toast message with the title
    // clear lightning-datatable draft values
    handleSave(event) {
      // notify loading
      const updatedFields = event.detail.draftValues;
      // Update the records via Apex
      updateBoatList({data: updatedFields})
      .then(() => {
          this.refresh();
        const successEvent = new ShowToastEvent({
            title: SUCCESS_TITLE,
            variant: SUCCESS_VARIANT,
            message: MESSAGE_SHIP_IT
        })
        this.dispatchEvent(successEvent);
      })
      .catch(error => {
          const errorEvent = new ShowToastEvent({
              title: ERROR_TITLE,
              variant: ERROR_VARIANT
          });
          this.dispatchEvent(errorEvent);
      })
      .finally(() => {});
    }
    // Check the current value of isLoading before dispatching the doneloading or loading custom event
    notifyLoading(isLoading) { 
        if(isLoading==true){
            const loading = new CustomEvent('loading');
            this.dispatchEvent(loading);
        }
        else{
            const doneLoading = new CustomEvent('doneloading');
            this.dispatchEvent(doneLoading);
        }
    }
}