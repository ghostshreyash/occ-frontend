import type { UseFormReturn } from "react-hook-form"

import { FieldLabel } from "@/components/ui/field"
import { DateField, FileDropField, PhoneField, SelectField, TextareaField, TextField } from "@/components/form/fields"
import { LocationPicker } from "@/components/common/location-picker"
import { plantTypes, salutations, subDepartmentFunctions, timeZones } from "@/data/mock"
import { areaForPostalCode, departmentTypes, plantCapacityUnitCodes } from "@/data/master-data"
import { coordsForCity } from "@/data/occ-tables"
import type { DepartmentValues, PlantValues, SubDepartmentValues } from "@/pages/enterprise-onboarding/schemas"

/*
 * One definition of each entity's fields, shared by onboarding, the review step
 * and the enterprise detail page. Adding a plant to an existing enterprise is
 * meant to be the same form as onboarding one, so it is literally the same code.
 *
 * Each group expects to sit inside a `grid gap-2.5 md:grid-cols-3` form.
 */

/**
 * Plant fields, including the plant's own coordinates. Work is dispatched to a
 * plant rather than to the head office, so the map pin lives here and nowhere
 * else.
 */
export function PlantFields({ form }: { form: UseFormReturn<PlantValues> }) {
  const { control, watch, setValue } = form
  const lat = parseFloat(watch("latitude") ?? "")
  const lng = parseFloat(watch("longitude") ?? "")

  // The postal code resolves the city and coordinates rather than being typed
  const fillFromPin = (code: string) => {
    const area = areaForPostalCode(code)
    if (!area) return
    setValue("city", area.city)
    const point = coordsForCity(area.city)
    if (point) {
      setValue("latitude", point.lat)
      setValue("longitude", point.lng)
    }
  }

  return (
    <>
      <TextField control={control} name="name" label="Plant Name" required placeholder="e.g. Mumbai Works" />
      <SelectField control={control} name="type" label="Plant Type" required options={plantTypes} />
      <TextField control={control} name="code" label="Plant Code" placeholder="e.g. TS-MUM-001" />

      {/* Title and head read as one name, so they share a cell */}
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
        <SelectField control={control} name="salutation" label="Title" required options={salutations} />
        <TextField control={control} name="head" label="Plant Head" required placeholder="e.g. S. Krishnan" />
      </div>
      <TextField control={control} name="email" label="Email" required type="email" placeholder="name@company.com" />
      <PhoneField control={control} codeName="phoneCode" name="phone" label="Phone Number" required />

      <TextareaField control={control} name="address" label="Plant Address" required rows={2} maxLength={250} className="md:col-span-3" />

      <TextField control={control} name="pin" label="Postal Code" required onValueChange={fillFromPin} />
      <TextField control={control} name="city" label="City" required />
      {/* The pair shares one cell so the row fills all three columns evenly */}
      <div className="grid grid-cols-2 gap-2">
        <TextField control={control} name="latitude" label="Latitude" readOnly inputClassName="bg-muted/60" />
        <TextField control={control} name="longitude" label="Longitude" readOnly inputClassName="bg-muted/60" />
      </div>

      <div className="md:col-span-3">
        <FieldLabel className="mb-2">Adjust Plant Location</FieldLabel>
        <LocationPicker
          lat={Number.isNaN(lat) ? undefined : lat}
          lng={Number.isNaN(lng) ? undefined : lng}
          onChange={(point) => {
            setValue("latitude", String(point.lat))
            setValue("longitude", String(point.lng))
          }}
        />
      </div>

      <h4 className="text-sm font-semibold md:col-span-3">Additional Information</h4>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
        <TextField control={control} name="capacity" label="Plant Capacity" inputMode="decimal" placeholder="e.g. 5" />
        <SelectField control={control} name="capacityUnit" label="Unit" options={plantCapacityUnitCodes} placeholder="Unit" />
      </div>
      <DateField control={control} name="commissioningDate" label="Commissioning Date" />
      <SelectField control={control} name="timeZone" label="Time Zone" options={timeZones} />

      <FileDropField control={control} name="logo" label="Plant Logo" />
      <TextareaField control={control} name="notes" label="Notes" rows={4} placeholder="Enter any additional information about the plant..." className="md:col-span-2" />
    </>
  )
}

/** Department fields. Every field is optional - a plant can stand without one. */
export function DepartmentFields({ form }: { form: UseFormReturn<DepartmentValues> }) {
  const { control } = form
  return (
    <>
      <TextField control={control} name="name" label="Department Name" placeholder="e.g. Electrical Maintenance" />
      <TextField control={control} name="code" label="Department Code" placeholder="e.g. DEPT-EL" />
      <SelectField control={control} name="type" label="Department Type" options={departmentTypes} />
      <TextField control={control} name="parent" label="Parent Department" placeholder="Leave blank for a top-level department" />
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
        <SelectField control={control} name="salutation" label="Title" options={salutations} />
        <TextField control={control} name="head" label="Head of Department" />
      </div>
      <TextField control={control} name="email" label="Email" type="email" placeholder="name@company.com" />
      <PhoneField control={control} codeName="phoneCode" name="phone" label="Phone Number" />
      <TextareaField control={control} name="description" label="Description" rows={2} className="md:col-span-3" />
    </>
  )
}

/** Sub-department fields */
export function SubDepartmentFields({ form }: { form: UseFormReturn<SubDepartmentValues> }) {
  const { control } = form
  return (
    <>
      <TextField control={control} name="name" label="Sub-department Name" placeholder="e.g. HT Maintenance" />
      <TextField control={control} name="code" label="Sub-department Code" placeholder="e.g. SUB-EL-HT" />
      <SelectField control={control} name="function" label="Function" options={subDepartmentFunctions} />
      <TextField control={control} name="description" label="Description" className="md:col-span-3" />
    </>
  )
}
