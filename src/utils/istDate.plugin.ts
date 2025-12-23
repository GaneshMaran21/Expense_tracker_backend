import { Schema } from 'mongoose';
import { toIST, toUTC, getCurrentIST } from './istDate.utils';

// Re-export utilities for convenience
export { toIST, toUTC, getCurrentIST };

/**
 * Helper function to process a single document and convert dates to IST
 */
function processDocToIST(doc: any, schema: Schema) {
  if (!doc || typeof doc !== 'object') return;
  
  // Skip if it's a Mongoose document that's already been processed
  if (doc._istProcessed) return;
  doc._istProcessed = true;
  
  schema.eachPath((path: string, type: any) => {
    if (type.instance === 'Date' && doc[path]) {
      try {
        // Convert UTC date from DB to IST
        const utcDate = new Date(doc[path]);
        if (!isNaN(utcDate.getTime())) {
          doc[path] = toIST(utcDate);
        }
      } catch (error) {
        console.warn(`Error converting date field ${path} to IST:`, error);
      }
    }
  });
  
  // Handle createdAt and updatedAt (timestamps) - these are added by Mongoose
  if (doc.createdAt && doc.createdAt instanceof Date) {
    try {
      doc.createdAt = toIST(new Date(doc.createdAt));
    } catch (error) {
      console.warn('Error converting createdAt to IST:', error);
    }
  }
  if (doc.updatedAt && doc.updatedAt instanceof Date) {
    try {
      doc.updatedAt = toIST(new Date(doc.updatedAt));
    } catch (error) {
      console.warn('Error converting updatedAt to IST:', error);
    }
  }
}

/**
 * Helper function to convert dates to UTC before saving
 */
function processDocToUTC(doc: any, schema: Schema) {
  if (!doc || typeof doc !== 'object') return;
  
  schema.eachPath((path: string, type: any) => {
    if (type.instance === 'Date' && doc[path]) {
      try {
        // Convert IST date to UTC for storage
        const dateValue = new Date(doc[path]);
        if (!isNaN(dateValue.getTime())) {
          doc[path] = toUTC(dateValue);
        }
      } catch (error) {
        console.warn(`Error converting date field ${path} to UTC:`, error);
      }
    }
  });
  
  // Handle createdAt and updatedAt (timestamps)
  // Note: Mongoose handles these automatically, but we ensure they're UTC
  if (doc.createdAt && doc.createdAt instanceof Date) {
    try {
      doc.createdAt = toUTC(new Date(doc.createdAt));
    } catch (error) {
      // Ignore - Mongoose will set this
    }
  }
  if (doc.updatedAt && doc.updatedAt instanceof Date) {
    try {
      doc.updatedAt = toUTC(new Date(doc.updatedAt));
    } catch (error) {
      // Ignore - Mongoose will set this
    }
  }
}

/**
 * Mongoose plugin to handle IST dates across all schemas
 * 
 * This plugin:
 * - Converts all Date fields to UTC before saving (MongoDB stores in UTC)
 * - Converts all Date fields from UTC to IST when retrieving
 * - Works with timestamps (createdAt, updatedAt)
 * - Handles all query methods (find, findOne, findOneAndUpdate, etc.)
 */
export function istDatePlugin(schema: Schema) {
  // Before saving: Convert dates to UTC (MongoDB stores in UTC)
  // This hook runs for both create and update operations
  schema.pre('save', function (next) {
    const doc = this as any;
    processDocToUTC(doc, schema);
    next();
  });

  // Before updating: Convert dates in update object to UTC
  schema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace'], function (next) {
    const update = this.getUpdate() as any;
    if (update && typeof update === 'object') {
      // Handle $set, $setOnInsert, etc.
      if (update.$set) {
        schema.eachPath((path: string, type: any) => {
          if (type.instance === 'Date' && update.$set[path]) {
            try {
              update.$set[path] = toUTC(new Date(update.$set[path]));
            } catch (error) {
              console.warn(`Error converting update date field ${path} to UTC:`, error);
            }
          }
        });
      }
      // Handle direct updates
      schema.eachPath((path: string, type: any) => {
        if (type.instance === 'Date' && update[path]) {
          try {
            update[path] = toUTC(new Date(update[path]));
          } catch (error) {
            console.warn(`Error converting update date field ${path} to UTC:`, error);
          }
        }
      });
    }
    next();
  });

  // After retrieving: Convert dates from UTC to IST
  // Handle all query methods that return documents
  schema.post('find', function (docs: any) {
    if (!docs || !Array.isArray(docs)) return;
    docs.forEach((doc) => {
      if (doc && typeof doc === 'object') {
        processDocToIST(doc, schema);
      }
    });
  });

  schema.post('findOne', function (doc: any) {
    if (doc && typeof doc === 'object') {
      processDocToIST(doc, schema);
    }
  });

  schema.post('findOneAndUpdate', function (doc: any) {
    if (doc && typeof doc === 'object') {
      processDocToIST(doc, schema);
    }
  });

  schema.post('findOneAndDelete', function (doc: any) {
    if (doc && typeof doc === 'object') {
      processDocToIST(doc, schema);
    }
  });

  schema.post('findOneAndReplace', function (doc: any) {
    if (doc && typeof doc === 'object') {
      processDocToIST(doc, schema);
    }
  });

  // Note: findById, findByIdAndUpdate, findByIdAndDelete are handled by
  // findOne and findOneAndUpdate/findOneAndDelete hooks respectively

  // Handle aggregate results
  schema.post('aggregate', function (docs: any) {
    if (!docs || !Array.isArray(docs)) return;
    
    docs.forEach((doc) => {
      if (doc && typeof doc === 'object') {
        processDocToIST(doc, schema);
      }
    });
  });
}
