import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CustomDatePickerComponent } from './Shared/custom-date-picker/custom-date-picker.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DatePickerDemoComponent } from './Shared/date-picker-demo/date-picker-demo.component';
import { CustomCalenderComponent } from './calender/custom-calender/custom-calender.component';

@NgModule({
  declarations: [
    AppComponent,
    CustomDatePickerComponent,
    DatePickerDemoComponent,
    CustomCalenderComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  exports: [
    CustomDatePickerComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
