import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CustomDatePickerComponent } from './Shared/custom-date-picker/custom-date-picker.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DatePickerDemoComponent } from './Shared/date-picker-demo/date-picker-demo.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MultilevelGridComponent } from './Shared/multilevel-grid/multilevel-grid.component';
import { AgGridModule } from 'ag-grid-angular';
import { GridDemoComponent } from './Shared/grid-demo/grid-demo.component';

@NgModule({
  declarations: [
    AppComponent,
    CustomDatePickerComponent,
    DatePickerDemoComponent,
    MultilevelGridComponent,
    GridDemoComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AgGridModule
  ],
  exports: [
    CustomDatePickerComponent
  ],
  providers: [
    DatePipe
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
