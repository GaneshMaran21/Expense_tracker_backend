import { Schema } from 'mongoose';
import { toIST, toUTC, getCurrentIST } from './istDate.utils';

// Re-export utilities for convenience
export { toIST, toUTC, getCurrentIST };

/**
 * Helper function to process a single document and convert dates to IST
 */
function processDocToIST(doc: any, schema: Schema) {
  if (!doc || typeof doc !== 'object') return;
  
  schema.eachPath((path: string, type: any) => {
    if (type.instance === 'Date' && doc[path]) {
      // Convert UTC date from DB to IST
      const utcDate = new Date(doc[path]);
      doc[path] = toIST(utcDate);
    }
  });
  
  // Handle createdAt and updatedAt (timestamps)
  if (doc.createdAt) {
    doc.createdAt = toIST(new Date(doc.createdAt));
  }
  if (doc.updatedAt) {
    doc.updatedAt = toIST(new Date(doc.updatedAt));
  }
}

/**
 * Mongoose plugin to handle IST dates
 * Automatically converts dates to/from IST
 */
export function istDatePlugin(schema: Schema) {
  // Before saving: Convert dates to UTC (MongoDB stores in UTC)
  schema.pre('save', function (next) {
    const doc = this as any;
    
    // Find all date fields in the document
    schema.eachPath((path: string, type: any) => {
      if (type.instance === 'Date' && doc[path]) {
        // If it's a date field, ensure it's stored as UTC
        // The date coming from frontend (IST) should be converted to UTC
        if (doc.isModified(path)) {
          doc[path] = toUTC(new Date(doc[path]));
        }
      }
    });
    
    // Handle createdAt and updatedAt (timestamps)
    if (doc.createdAt) {
      doc.createdAt = toUTC(new Date(doc.createdAt));
    }
    if (doc.updatedAt) {
      doc.updatedAt = toUTC(new Date(doc.updatedAt));
    }
    
    next();
  });

  // After retrieving: Convert dates from UTC to IST
  schema.post(['find', 'findOne', 'findOneAndUpdate'], function (docs: any) {
    if (!docs) return;
    
    if (Array.isArray(docs)) {
      docs.forEach((doc) => processDocToIST(doc, schema));
    } else {
      processDocToIST(docs, schema);
    }
  });
}
