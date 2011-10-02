#!/usr/bin/env python

# Sand dancer tests

import os
import re
from struct import unpack

# The following classes are taken from Glulxe's profile-analyze.py
class InformFunc:
    def __init__(self, funcnum):
        self.funcnum = funcnum
        self.name = '<???>'
        self.addr = 0
        self.linenum = None
        self.endaddr = None
        self.endlinenum = None
        self.locals = None
        self.seqpts = None
    def __repr__(self):
        return '<InformFunc $' + hex(self.addr)[2:] + ' ' + repr(self.name) + '>'
            
class DebugFile:
    def __init__(self, fl):
        self.files = {}
        self.functions = {}
        self.function_names = {}
        self.classes = []
        self.objects = {}
        self.arrays = {}
        self.globals = {}
        self.properties = {}
        self.attributes = {}
        self.actions = {}
        self.fake_actions = {}
        self.map = {}
        self.header = None
        
        dat = fl.read(2)
        val = unpack('>H', dat)[0]
        if (val != 0xDEBF):
            raise ValueError('not an Inform debug file')
            
        dat = fl.read(2)
        self.debugversion = unpack('>H', dat)[0]
        dat = fl.read(2)
        self.informversion = unpack('>H', dat)[0]

        rectable = {
            1:  self.read_file_rec,
            2:  self.read_class_rec,
            3:  self.read_object_rec,
            4:  self.read_global_rec,
            5:  self.read_attr_rec,
            6:  self.read_prop_rec,
            7:  self.read_fake_action_rec,
            8:  self.read_action_rec,
            9:  self.read_header_rec,
            10: self.read_lineref_rec,
            11: self.read_routine_rec,
            12: self.read_array_rec,
            13: self.read_map_rec,
            14: self.read_routine_end_rec,
        }

        while True:
            dat = fl.read(1)
            rectype = unpack('>B', dat)[0]
            if (rectype == 0):
                break
            recfunc = rectable.get(rectype)
            if (not recfunc):
                raise ValueError('unknown debug record type: %d' % (rectype,))
            recfunc(fl)

        for func in self.functions.values():
            self.function_names[func.name] = func

    def read_file_rec(self, fl):
        dat = fl.read(1)
        filenum = unpack('>B', dat)[0]
        includename = self.read_string(fl)
        realname = self.read_string(fl)
        self.files[filenum] = ( includename, realname )
        
    def read_class_rec(self, fl):
        name = self.read_string(fl)
        start = self.read_linenum(fl)
        end = self.read_linenum(fl)
        self.classes.append( (name, start, end) )
        
    def read_object_rec(self, fl):
        dat = fl.read(2)
        num = unpack('>H', dat)[0]
        name = self.read_string(fl)
        start = self.read_linenum(fl)
        end = self.read_linenum(fl)
        self.objects[num] = (name, start, end)
    
    def read_global_rec(self, fl):
        dat = fl.read(1)
        num = unpack('>B', dat)[0]
        name = self.read_string(fl)
        self.arrays[num] = name
    
    def read_array_rec(self, fl):
        dat = fl.read(2)
        num = unpack('>H', dat)[0]
        name = self.read_string(fl)
        self.arrays[num] = name
    
    def read_attr_rec(self, fl):
        dat = fl.read(2)
        num = unpack('>H', dat)[0]
        name = self.read_string(fl)
        self.attributes[num] = name
    
    def read_prop_rec(self, fl):
        dat = fl.read(2)
        num = unpack('>H', dat)[0]
        name = self.read_string(fl)
        self.properties[num] = name
    
    def read_action_rec(self, fl):
        dat = fl.read(2)
        num = unpack('>H', dat)[0]
        name = self.read_string(fl)
        self.actions[num] = name
    
    def read_fake_action_rec(self, fl):
        dat = fl.read(2)
        num = unpack('>H', dat)[0]
        name = self.read_string(fl)
        self.fake_actions[num] = name
    
    def read_routine_rec(self, fl):
        dat = fl.read(2)
        funcnum = unpack('>H', dat)[0]
        func = self.get_function(funcnum)
        
        func.linenum = self.read_linenum(fl)
        dat = fl.read(3)
        addr = unpack('>I', '\0'+dat)[0]
        func.addr = int(addr)
        func.name = self.read_string(fl)
        locals = []
        while True:
            val = self.read_string(fl)
            if (not val):
                break
            locals.append(val)
        func.locals = locals

    def read_lineref_rec(self, fl):
        dat = fl.read(2)
        funcnum = unpack('>H', dat)[0]
        func = self.get_function(funcnum)

        if (not func.seqpts):
            func.seqpts = []
        
        dat = fl.read(2)
        count = unpack('>H', dat)[0]
        for ix in range(count):
            linenum = self.read_linenum(fl)
            dat = fl.read(2)
            addr = unpack('>H', dat)[0]
            func.seqpts.append( (linenum, addr) )
        
    def read_routine_end_rec(self, fl):
        dat = fl.read(2)
        funcnum = unpack('>H', dat)[0]
        func = self.get_function(funcnum)

        func.endlinenum = self.read_linenum(fl)
        dat = fl.read(3)
        addr = unpack('>I', '\0'+dat)[0]
        func.endaddr = int(addr)

    def read_header_rec(self, fl):
        dat = fl.read(64)
        self.header = dat
    
    def read_map_rec(self, fl):
        while True:
            name = self.read_string(fl)
            if (not name):
                break
            dat = fl.read(3)
            addr = unpack('>I', '\0'+dat)[0]
            addr = int(addr)
            self.map[name] = addr
    
    def read_linenum(self, fl):
        dat = fl.read(4)
        #if len(dat) < 4:
		#	return (0,0,0)
        (funcnum, linenum, charnum) = unpack('>BHB', dat)
        return (funcnum, linenum, charnum)

    def read_string(self, fl):
        val = ''
        while True:
            dat = fl.read(1)
            #print dat, len(dat)
            if (dat == '\0'):
                return val
            val += dat

    def get_function(self, funcnum):
        func = self.functions.get(funcnum)
        if (not func):
            func = InformFunc(funcnum)
            self.functions[funcnum] = func
        return func

# Compile the .inf
command = 'inform -kE2~S~Dwx praxix.inf'
#command = 'inform -k~Dx praxix.inf'
os.system(command)

# Load the debug file
debugfile = file('gameinfo.dbg', 'rb')
debug = DebugFile(debugfile)

# Prepare the JSON list of functions
offset = debug.map['code area']
funcs = {}
for key, func in debug.functions.items():
	funcs[func.addr + offset] = re.sub(r'\W', '', func.name)

# Write out
names = open('praxix.js', 'w')
names.write('vm_functions = ' + str(funcs))
names.close()
