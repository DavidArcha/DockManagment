import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CustomDatePickerComponent } from './Shared/custom-date-picker/custom-date-picker.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    CustomDatePickerComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CommonModule,
    FormsModule 
  ],
  exports: [
    CustomDatePickerComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
